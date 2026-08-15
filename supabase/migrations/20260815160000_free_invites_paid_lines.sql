-- Invites (guest memberships) are free and uncapped.
-- Seat limits stay per Lokr. Extra groups a person owns are billed in the app.

drop trigger if exists lokr_workspace_members_cap on public.lokr_workspace_members;
drop function if exists public.lokr_guard_lockr_cap();

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
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  account := case when p_account_type = 'business' then 'business' else 'personal' end;

  insert into public.lokr_workspaces (name, account_type, created_by, plan)
  values (nullif(btrim(coalesce(p_name, '')), ''), account, current_user_id, 'free')
  returning id into workspace_id;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'admin');

  return workspace_id;
end;
$$;
