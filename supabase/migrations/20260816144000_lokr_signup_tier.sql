-- Tag new My Lokr Auth users in the shared profiles.tier column so free
-- signups can be filtered (tier = 'my_lokr_free'). Other apps keep their
-- own defaults. Existing rows are not updated (on conflict do nothing).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  signup_app text := coalesce(new.raw_user_meta_data->>'signup_app', '');
  initial_tier text := 'support';
begin
  if signup_app = 'secret-agent' then
    initial_tier := 'sa_free';
  elsif signup_app = 'goshop' then
    initial_tier := 'goshop_free';
  elsif signup_app = 'my-support-agent' then
    initial_tier := 'msa-trial';
  elsif signup_app = 'toc' then
    initial_tier := 'toc_free';
  elsif signup_app = 'friday_canvas' then
    initial_tier := 'trial-fc';
  elsif signup_app = 'notie' then
    initial_tier := 'notie_free';
  elsif signup_app = 'my_lokr' then
    initial_tier := 'my_lokr_free';
  end if;

  insert into public.profiles (id, email, tier)
  values (new.id, new.email, initial_tier)
  on conflict (id) do nothing;

  return new;
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

  insert into public.profiles (id, email, full_name, tier)
  values (current_user_id, user_email, null, 'my_lokr_free')
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
