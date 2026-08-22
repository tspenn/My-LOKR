-- newapps@skylandreach.com owns the public sample locker and may send
-- unlimited shares (not seat-capped invites). New accounts get a locker
-- immediately so a share link opens the real app.

create or replace function public.lokr_sample_owner_email()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'newapps@skylandreach.com';
$$;

create or replace function public.lokr_is_sample_owner_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(p_email, ''))) = public.lokr_sample_owner_email();
$$;

create or replace function public.lokr_sample_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id
  from public.lokr_workspaces w
  join public.profiles p on p.id = w.created_by
  where public.lokr_is_sample_owner_email(p.email)
  order by w.created_at asc
  limit 1;
$$;

create or replace function public.lokr_create_workspace(
  p_name text,
  p_account_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_id uuid;
  account text;
  owned integer;
  owner_email text;
  locker_name text;
  locker_plan text;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select count(*) into owned
  from public.lokr_workspaces w
  where w.created_by = current_user_id;

  if coalesce(owned, 0) >= 1 then
    raise exception 'You already have your LOKR. Invitees can still add you to theirs.';
  end if;

  select lower(coalesce(p.email, auth.jwt() ->> 'email', '')) into owner_email
  from public.profiles p
  where p.id = current_user_id;
  if owner_email is null or owner_email = '' then
    owner_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;

  account := case when p_account_type = 'business' then 'business' else 'personal' end;
  locker_name := nullif(btrim(coalesce(p_name, '')), '');
  locker_plan := 'free';

  if public.lokr_is_sample_owner_email(owner_email) then
    locker_plan := 'enterprise';
    locker_name := coalesce(locker_name, 'Sample LOKR');
  end if;

  insert into public.lokr_workspaces (name, account_type, created_by, plan)
  values (locker_name, account, current_user_id, locker_plan)
  returning id into workspace_id;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'admin');

  return workspace_id;
end;
$$;

create or replace function public.lokr_ensure_own_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_id uuid;
  display_name text;
  locker_name text;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select w.id into workspace_id
  from public.lokr_workspaces w
  where w.created_by = current_user_id
  order by w.created_at asc
  limit 1;
  if workspace_id is not null then
    return workspace_id;
  end if;

  select m.workspace_id into workspace_id
  from public.lokr_workspace_members m
  where m.user_id = current_user_id
  order by m.joined_at asc
  limit 1;
  if workspace_id is not null then
    return workspace_id;
  end if;

  select nullif(btrim(coalesce(p.full_name, '')), '') into display_name
  from public.profiles p
  where p.id = current_user_id;

  if public.lokr_is_sample_owner_email(
    (select p.email from public.profiles p where p.id = current_user_id)
  ) then
    locker_name := 'Sample LOKR';
  elsif display_name is not null then
    locker_name := split_part(display_name, ' ', 1) || '''s LOKR';
  else
    locker_name := 'My LOKR';
  end if;

  return public.lokr_create_workspace(locker_name, 'personal');
end;
$$;

create or replace function public.lokr_accept_sample_share()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  workspace_id := public.lokr_sample_workspace_id();
  if workspace_id is null then
    raise exception 'This share is not open yet.';
  end if;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'member')
  on conflict (workspace_id, user_id) do nothing;

  return workspace_id;
end;
$$;

revoke all on function public.lokr_sample_owner_email() from public, anon;
revoke all on function public.lokr_is_sample_owner_email(text) from public, anon;
revoke all on function public.lokr_sample_workspace_id() from public, anon;
revoke all on function public.lokr_ensure_own_workspace() from public, anon;
revoke all on function public.lokr_accept_sample_share() from public, anon;
revoke all on function public.lokr_create_workspace(text, text) from public, anon;

grant execute on function public.lokr_sample_workspace_id() to authenticated;
grant execute on function public.lokr_ensure_own_workspace() to authenticated;
grant execute on function public.lokr_accept_sample_share() to authenticated;
grant execute on function public.lokr_create_workspace(text, text) to authenticated;

update public.lokr_workspaces w
set plan = 'enterprise'
from public.profiles p
where p.id = w.created_by
  and public.lokr_is_sample_owner_email(p.email);
