-- Public sandbox locker for fred@skylandapps.com only.
-- Apply this in the LOKR Supabase SQL editor (the database), not in any other app.
-- It lifts the seat cap and allows live video on that one locker so the demo
-- works like the full product. Real lockers stay at their plan limits.

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

  account := case when p_account_type = 'business' then 'business' else 'personal' end;

  insert into public.lokr_workspaces (name, account_type, created_by, plan)
  values (nullif(btrim(coalesce(p_name, '')), ''), account, current_user_id, 'free')
  returning id into workspace_id;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'admin');

  select lower(coalesce(p.email, '')) into owner_email
  from public.profiles p
  where p.id = current_user_id;

  if owner_email = 'fred@skylandapps.com' then
    update public.lokr_workspaces
    set plan = 'enterprise'
    where id = workspace_id;
  end if;

  return workspace_id;
end;
$$;

revoke all on function public.lokr_create_workspace(text, text) from public, anon;
grant execute on function public.lokr_create_workspace(text, text) to authenticated;

update public.lokr_workspaces w
set plan = 'enterprise'
from public.profiles p
where p.id = w.created_by
  and lower(coalesce(p.email, '')) = 'fred@skylandapps.com';
