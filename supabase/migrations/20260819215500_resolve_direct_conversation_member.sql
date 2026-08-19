-- Resolve the other person the same way as lokr_create_conversation:
-- membership user_id, membership row id, or the only other person in this LOKR.

create or replace function public.lokr_ensure_direct_conversation(
  p_other_user_id uuid,
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
  other_id uuid;
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

  select m.user_id
  into other_id
  from public.lokr_workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id <> current_user_id
    and (
      m.user_id = p_other_user_id
      or m.id = p_other_user_id
    )
  limit 1;

  if other_id is null then
    select count(*)::integer
    into other_count
    from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id <> current_user_id;

    if other_count = 1 then
      select m.user_id
      into other_id
      from public.lokr_workspace_members m
      where m.workspace_id = p_workspace_id
        and m.user_id <> current_user_id;
    end if;
  end if;

  if other_id is null or other_id = current_user_id then
    raise exception 'That person is not in this LOKR. Invite them from this conversation.';
  end if;

  select c.id into conversation_id
  from public.lokr_conversations c
  where c.workspace_id = p_workspace_id
    and exists (
      select 1 from public.lokr_conversation_members a
      where a.conversation_id = c.id and a.user_id = current_user_id
    )
    and exists (
      select 1 from public.lokr_conversation_members b
      where b.conversation_id = c.id and b.user_id = other_id
    )
    and (
      select count(*) from public.lokr_conversation_members m
      where m.conversation_id = c.id
    ) = 2
  order by c.updated_at desc
  limit 1;

  if conversation_id is not null then
    return conversation_id;
  end if;

  return public.lokr_create_conversation(null, array[other_id], p_workspace_id);
end;
$$;
