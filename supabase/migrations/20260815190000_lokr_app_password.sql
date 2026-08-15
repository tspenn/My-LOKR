-- My Lokr password is separate from Friday Canvas Auth.
-- Never write this hash into auth.users — that password is shared by every app.

create table if not exists public.lokr_passwords (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  password_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.lokr_password_pending (
  email text primary key,
  password_hash text not null,
  full_name text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

alter table public.lokr_passwords enable row level security;
alter table public.lokr_passwords force row level security;
alter table public.lokr_password_pending enable row level security;
alter table public.lokr_password_pending force row level security;

revoke all on table public.lokr_passwords from anon, authenticated, public;
revoke all on table public.lokr_password_pending from anon, authenticated, public;

create or replace function private.lokr_password_ok(p_password text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_password is not null and char_length(p_password) >= 12;
$$;

create or replace function public.lokr_has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lokr_passwords p
    where p.user_id = (select auth.uid())
  );
$$;

create or replace function public.lokr_stage_password(
  p_email text,
  p_password text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email text;
begin
  if to_regrole('service_role') is not null and current_user <> 'service_role' and current_user <> 'postgres' then
    if auth.role() is distinct from 'service_role' then
      raise exception 'Not allowed';
    end if;
  end if;

  email := lower(btrim(p_email));
  if email is null or email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter a valid email';
  end if;
  if not private.lokr_password_ok(p_password) then
    raise exception 'Choose a My Lokr password with at least 12 characters';
  end if;
  if exists (
    select 1
    from public.profiles pr
    join public.lokr_passwords pw on pw.user_id = pr.id
    where lower(btrim(pr.email)) = email
  ) then
    raise exception 'That email already has a My Lokr password — sign in';
  end if;

  insert into public.lokr_password_pending (email, password_hash, full_name, expires_at)
  values (
    email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    nullif(btrim(p_full_name), ''),
    now() + interval '24 hours'
  )
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        full_name = excluded.full_name,
        expires_at = excluded.expires_at,
        created_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.lokr_activate_pending_password()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  user_email text;
  pending public.lokr_password_pending%rowtype;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select lower(btrim(p.email)) into user_email
  from public.profiles p
  where p.id = current_user_id;

  if user_email is null then
    select lower(btrim(u.email)) into user_email
    from auth.users u
    where u.id = current_user_id;
  end if;

  if user_email is null then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.profiles (id, email, full_name)
  values (current_user_id, user_email, null)
  on conflict (id) do update
    set email = coalesce(nullif(btrim(public.profiles.email), ''), excluded.email);

  if exists (
    select 1 from public.lokr_passwords pw where pw.user_id = current_user_id
  ) then
    delete from public.lokr_password_pending where email = user_email;
    return jsonb_build_object('ok', true);
  end if;

  select * into pending
  from public.lokr_password_pending s
  where s.email = user_email
    and s.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.lokr_passwords (user_id, password_hash, failed_attempts, locked_until, updated_at)
  values (current_user_id, pending.password_hash, 0, null, now())
  on conflict (user_id) do nothing;

  delete from public.lokr_password_pending where email = user_email;

  if pending.full_name is not null then
    update public.profiles
    set full_name = pending.full_name, email = user_email
    where id = current_user_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.lokr_set_own_password(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;
  if not private.lokr_password_ok(p_password) then
    raise exception 'Choose a My Lokr password with at least 12 characters';
  end if;

  insert into public.lokr_passwords (user_id, password_hash, failed_attempts, locked_until, updated_at)
  values (
    current_user_id,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    0,
    null,
    now()
  )
  on conflict (user_id) do update
    set password_hash = excluded.password_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.lokr_set_password_for_user(p_user_id uuid, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regrole('service_role') is not null and current_user <> 'service_role' and current_user <> 'postgres' then
    if auth.role() is distinct from 'service_role' then
      raise exception 'Not allowed';
    end if;
  end if;
  if p_user_id is null then
    raise exception 'Missing user';
  end if;
  if not private.lokr_password_ok(p_password) then
    raise exception 'Choose a My Lokr password with at least 12 characters';
  end if;

  insert into public.lokr_passwords (user_id, password_hash, failed_attempts, locked_until, updated_at)
  values (
    p_user_id,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    0,
    null,
    now()
  )
  on conflict (user_id) do update
    set password_hash = excluded.password_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.lokr_verify_password(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  email text;
  found_id uuid;
  stored_hash text;
  locked timestamptz;
  attempts integer;
begin
  email := lower(btrim(p_email));
  if email is null or p_password is null then
    return null;
  end if;

  select pr.id, pw.password_hash, pw.locked_until, pw.failed_attempts
  into found_id, stored_hash, locked, attempts
  from public.profiles pr
  join public.lokr_passwords pw on pw.user_id = pr.id
  where lower(btrim(pr.email)) = email;

  if found_id is null then
    return null;
  end if;

  if locked is not null and locked > now() then
    return null;
  end if;

  if stored_hash = extensions.crypt(p_password, stored_hash) then
    update public.lokr_passwords
    set failed_attempts = 0, locked_until = null
    where user_id = found_id;
    return found_id;
  end if;

  attempts := coalesce(attempts, 0) + 1;
  update public.lokr_passwords
  set
    failed_attempts = attempts,
    locked_until = case when attempts >= 8 then now() + interval '15 minutes' else locked_until end
  where user_id = found_id;

  return null;
end;
$$;

grant execute on function public.lokr_has_password() to authenticated;
grant execute on function public.lokr_activate_pending_password() to authenticated;
grant execute on function public.lokr_set_own_password(text) to authenticated;
grant execute on function public.lokr_stage_password(text, text, text) to service_role;
grant execute on function public.lokr_set_password_for_user(uuid, text) to service_role;
grant execute on function public.lokr_verify_password(text, text) to service_role;

revoke execute on function public.lokr_stage_password(text, text, text) from anon, authenticated, public;
revoke execute on function public.lokr_set_password_for_user(uuid, text) from anon, authenticated, public;
revoke execute on function public.lokr_verify_password(text, text) from anon, authenticated, public;
