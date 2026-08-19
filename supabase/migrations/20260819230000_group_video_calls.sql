-- Group video calls: every conversation member can join, each on their own screen.

drop policy if exists "lokr call participants read" on public.lokr_calls;
create policy "lokr call participants read"
  on public.lokr_calls for select to authenticated
  using (private.lokr_is_conversation_member(conversation_id));

drop policy if exists "lokr call participants update" on public.lokr_calls;
create policy "lokr call participants update"
  on public.lokr_calls for update to authenticated
  using (private.lokr_is_conversation_member(conversation_id))
  with check (private.lokr_is_conversation_member(conversation_id));

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
  call_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if not private.lokr_is_conversation_member(p_conversation_id) then
    raise exception 'You are not in that conversation';
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

alter table public.lokr_calls replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.lokr_calls;
  exception when duplicate_object then null;
  end;
end;
$$;
