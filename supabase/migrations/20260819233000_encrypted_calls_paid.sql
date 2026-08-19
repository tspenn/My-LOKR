-- Encrypted video calls are a paid-locker feature.

create or replace function public.lokr_start_call(p_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  other_id uuid;
  member_count integer;
  workspace_plan text;
  call_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if not private.lokr_is_conversation_member(p_conversation_id) then
    raise exception 'You are not in that conversation';
  end if;

  select w.plan into workspace_plan
  from public.lokr_conversations c
  join public.lokr_workspaces w on w.id = c.workspace_id
  where c.id = p_conversation_id;

  if workspace_plan is null or workspace_plan not in ('business', 'enterprise') then
    raise exception 'Encrypted video calls are on Business';
  end if;

  select count(*) into member_count
  from public.lokr_conversation_members
  where conversation_id = p_conversation_id;

  if member_count < 2 then
    raise exception 'Video calls need at least one other person';
  end if;

  if member_count > 6 then
    raise exception 'Video calls are for up to 6 people';
  end if;

  select user_id into other_id
  from public.lokr_conversation_members
  where conversation_id = p_conversation_id
    and user_id <> current_user_id
  limit 1;

  update public.lokr_calls
  set status = 'ended', ended_at = now()
  where conversation_id = p_conversation_id
    and status in ('ringing', 'active');

  insert into public.lokr_calls (conversation_id, caller_id, callee_id, status)
  values (p_conversation_id, current_user_id, other_id, 'ringing')
  returning id into call_id;

  return call_id;
end;
$$;
