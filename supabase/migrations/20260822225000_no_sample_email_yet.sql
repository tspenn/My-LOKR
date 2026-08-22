-- No sample-locker email is assigned yet. Keep create_workspace on the
-- normal Free rules until that inbox is chosen.

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

  return workspace_id;
end;
$$;

revoke all on function public.lokr_create_workspace(text, text) from public, anon;
grant execute on function public.lokr_create_workspace(text, text) to authenticated;
