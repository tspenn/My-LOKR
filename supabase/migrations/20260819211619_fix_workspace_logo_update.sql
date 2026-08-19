-- Admin workspace UPDATE compared membership.id to workspace_id, so logo
-- saves never stuck. Also restore the uploaded logo path when it is missing.

drop policy if exists "lokr admins update workspace" on public.lokr_workspaces;
create policy "lokr admins update workspace"
  on public.lokr_workspaces for update to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = lokr_workspaces.id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  )
  with check (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = lokr_workspaces.id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

drop policy if exists "lokr admins add workspace members" on public.lokr_workspace_members;
create policy "lokr admins add workspace members"
  on public.lokr_workspace_members for insert to authenticated
  with check (
    exists (
      select 1 from public.lokr_workspaces w
      where w.id = workspace_id and w.created_by = (select auth.uid())
    )
    or exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = lokr_workspace_members.workspace_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

create or replace function public.lokr_set_workspace_logo(
  p_workspace_id uuid,
  p_logo_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in';
  end if;

  if p_workspace_id is null
    or p_logo_path is null
    or char_length(btrim(p_logo_path)) < 8
  then
    raise exception 'We could not save that logo';
  end if;

  if not exists (
    select 1 from public.lokr_workspaces w
    where w.id = p_workspace_id
      and (
        w.created_by = (select auth.uid())
        or exists (
          select 1 from public.lokr_workspace_members m
          where m.workspace_id = w.id
            and m.user_id = (select auth.uid())
            and m.role = 'admin'
        )
      )
  ) then
    raise exception 'Only an admin can change this logo';
  end if;

  update public.lokr_workspaces
  set logo_path = btrim(p_logo_path)
  where id = p_workspace_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.lokr_set_workspace_logo(uuid, text) to authenticated;
revoke execute on function public.lokr_set_workspace_logo(uuid, text) from anon, public;

update public.lokr_workspaces w
set logo_path = latest.name
from (
  select distinct on ((storage.foldername(o.name))[1])
    o.name,
    (storage.foldername(o.name))[1]::uuid as workspace_id
  from storage.objects o
  where o.bucket_id = 'lokr-logos'
    and (storage.foldername(o.name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  order by (storage.foldername(o.name))[1], o.created_at desc
) latest
where w.id = latest.workspace_id
  and w.logo_path is null;

notify pgrst, 'reload schema';
