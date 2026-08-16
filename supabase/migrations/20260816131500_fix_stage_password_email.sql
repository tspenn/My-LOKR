-- Signup failed with: column reference "email" is ambiguous.
-- lokr_stage_password used a variable named email while inserting into a
-- table that also has an email column. Postgres treats that as an error.

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
  normalized_email text;
begin
  if to_regrole('service_role') is not null and current_user <> 'service_role' and current_user <> 'postgres' then
    if auth.role() is distinct from 'service_role' then
      raise exception 'Not allowed';
    end if;
  end if;

  normalized_email := lower(btrim(p_email));
  if normalized_email is null or normalized_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter a valid email';
  end if;
  if not private.lokr_password_ok(p_password) then
    raise exception 'Choose a My Lokr password with at least 12 characters';
  end if;
  if exists (
    select 1
    from public.profiles pr
    join public.lokr_passwords pw on pw.user_id = pr.id
    where lower(btrim(pr.email)) = normalized_email
  ) then
    raise exception 'That email already has a My Lokr password — sign in';
  end if;

  insert into public.lokr_password_pending (email, password_hash, full_name, expires_at)
  values (
    normalized_email,
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

create or replace function public.lokr_verify_password(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  found_id uuid;
  stored_hash text;
  locked timestamptz;
  attempts integer;
begin
  normalized_email := lower(btrim(p_email));
  if normalized_email is null or p_password is null then
    return null;
  end if;

  select pr.id, pw.password_hash, pw.locked_until, pw.failed_attempts
  into found_id, stored_hash, locked, attempts
  from public.profiles pr
  join public.lokr_passwords pw on pw.user_id = pr.id
  where lower(btrim(pr.email)) = normalized_email;

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
