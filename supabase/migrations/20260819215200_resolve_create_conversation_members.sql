-- New message listed Tina, then rejected her. The RPC required every
-- supplied id to equal lokr_workspace_members.user_id. The compose form
-- can send a membership row id, a profile id, or a mismatched uuid from
-- the nested people query. Resolve those to actual member user_ids, and
-- if this LOKR has exactly one other person, write to them.

create or replace function public.lokr_create_conversation(
  p_subject text,
  p_member_ids uuid[],
  p_workspace_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  conversation_id uuid;
  member_id uuid;
  unique_ids uuid[];
  other_count integer;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_workspace_id is null then
    raise exception 'Choose a LOKR first';
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = current_user_id
  ) then
    raise exception 'You are not in that LOKR';
  end if;

  select coalesce(array_agg(distinct m.user_id), '{}'::uuid[])
  into unique_ids
  from public.lokr_workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id <> current_user_id
    and (
      m.user_id = any(coalesce(p_member_ids, '{}'::uuid[]))
      or m.id = any(coalesce(p_member_ids, '{}'::uuid[]))
    );

  if unique_ids is null or cardinality(unique_ids) < 1 then
    select count(*)::integer
    into other_count
    from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id <> current_user_id;

    if other_count = 1 then
      select array_agg(m.user_id)
      into unique_ids
      from public.lokr_workspace_members m
      where m.workspace_id = p_workspace_id
        and m.user_id <> current_user_id;
    else
      raise exception 'That person is not in this LOKR. Invite them from Settings first.';
    end if;
  end if;

  insert into public.lokr_conversations (workspace_id, subject, created_by)
  values (p_workspace_id, nullif(btrim(coalesce(p_subject, '')), ''), current_user_id)
  returning id into conversation_id;

  insert into public.lokr_conversation_members (conversation_id, user_id, role)
  values (conversation_id, current_user_id, 'admin');

  foreach member_id in array unique_ids
  loop
    insert into public.lokr_conversation_members (conversation_id, user_id, role)
    values (conversation_id, member_id, 'member');
  end loop;

  return conversation_id;
end;
$$;
