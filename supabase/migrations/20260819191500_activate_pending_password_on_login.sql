-- If the confirmation email already verified the user but the browser
-- never received a session, the staged LOKR password was left pending.
-- Password sign-in should still activate it for a confirmed email.

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
  pending public.lokr_password_pending%rowtype;
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
    select u.id into found_id
    from auth.users u
    where lower(btrim(u.email)) = normalized_email
      and u.email_confirmed_at is not null;

    if found_id is null then
      return null;
    end if;

    select * into pending
    from public.lokr_password_pending s
    where s.email = normalized_email
      and s.expires_at > now();

    if not found then
      return null;
    end if;

    if pending.password_hash is distinct from extensions.crypt(p_password, pending.password_hash) then
      return null;
    end if;

    insert into public.profiles (id, email, full_name, tier)
    values (found_id, normalized_email, pending.full_name, 'my_lokr_free')
    on conflict (id) do update
      set email = coalesce(nullif(btrim(public.profiles.email), ''), excluded.email),
          full_name = coalesce(public.profiles.full_name, excluded.full_name);

    insert into public.lokr_passwords (user_id, password_hash, failed_attempts, locked_until, updated_at)
    values (found_id, pending.password_hash, 0, null, now())
    on conflict (user_id) do nothing;

    delete from public.lokr_password_pending where email = normalized_email;
    return found_id;
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
