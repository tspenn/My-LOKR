-- 1:1 calls, distribution lists, and video attachments for My Lokr.

update storage.buckets
set
  file_size_limit = 83886080,
  allowed_mime_types = array[
    'image/jpeg','image/png','image/gif','image/webp','application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv',
    'video/webm','video/mp4','video/quicktime'
  ]
where id = 'lokr-attachments';

create table if not exists public.lokr_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.lokr_conversations (id) on delete cascade,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists lokr_calls_callee_idx on public.lokr_calls (callee_id, status);
create index if not exists lokr_calls_conversation_idx on public.lokr_calls (conversation_id);

alter table public.lokr_calls enable row level security;

drop policy if exists "lokr call participants read" on public.lokr_calls;
create policy "lokr call participants read"
  on public.lokr_calls for select to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid());

drop policy if exists "lokr call participants update" on public.lokr_calls;
create policy "lokr call participants update"
  on public.lokr_calls for update to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid())
  with check (caller_id = auth.uid() or callee_id = auth.uid());

create table if not exists public.lokr_distribution_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lokr_workspaces (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.lokr_distribution_list_members (
  list_id uuid not null references public.lokr_distribution_lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (list_id, user_id)
);

create index if not exists lokr_lists_workspace_idx on public.lokr_distribution_lists (workspace_id);

alter table public.lokr_distribution_lists enable row level security;
alter table public.lokr_distribution_list_members enable row level security;

drop policy if exists "lokr lists read" on public.lokr_distribution_lists;
create policy "lokr lists read"
  on public.lokr_distribution_lists for select to authenticated
  using (private.lokr_is_workspace_member(workspace_id));

drop policy if exists "lokr lists insert" on public.lokr_distribution_lists;
create policy "lokr lists insert"
  on public.lokr_distribution_lists for insert to authenticated
  with check (
    created_by = auth.uid()
    and private.lokr_is_workspace_member(workspace_id)
  );

drop policy if exists "lokr lists update" on public.lokr_distribution_lists;
create policy "lokr lists update"
  on public.lokr_distribution_lists for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and private.lokr_is_workspace_member(workspace_id));

drop policy if exists "lokr lists delete" on public.lokr_distribution_lists;
create policy "lokr lists delete"
  on public.lokr_distribution_lists for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists "lokr list members read" on public.lokr_distribution_list_members;
create policy "lokr list members read"
  on public.lokr_distribution_list_members for select to authenticated
  using (
    exists (
      select 1 from public.lokr_distribution_lists l
      where l.id = list_id and private.lokr_is_workspace_member(l.workspace_id)
    )
  );

drop policy if exists "lokr list members write" on public.lokr_distribution_list_members;
create policy "lokr list members write"
  on public.lokr_distribution_list_members for insert to authenticated
  with check (
    exists (
      select 1 from public.lokr_distribution_lists l
      where l.id = list_id
        and l.created_by = auth.uid()
        and private.lokr_is_workspace_member(l.workspace_id)
    )
    and exists (
      select 1 from public.lokr_distribution_lists l
      join public.lokr_workspace_members m on m.workspace_id = l.workspace_id
      where l.id = list_id and m.user_id = lokr_distribution_list_members.user_id
    )
  );

drop policy if exists "lokr list members delete" on public.lokr_distribution_list_members;
create policy "lokr list members delete"
  on public.lokr_distribution_list_members for delete to authenticated
  using (
    exists (
      select 1 from public.lokr_distribution_lists l
      where l.id = list_id and l.created_by = auth.uid()
    )
  );

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

  if member_count <> 2 then
    raise exception 'Video calls are only for one other person';
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

create or replace function public.lokr_ensure_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_id uuid;
  conversation_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;
  if p_other_user_id is null or p_other_user_id = current_user_id then
    raise exception 'Choose someone else';
  end if;

  select wm.workspace_id into workspace_id
  from public.lokr_workspace_members wm
  where wm.user_id = current_user_id
  limit 1;

  if workspace_id is null then
    raise exception 'Set up your Lokr first';
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = workspace_id and m.user_id = p_other_user_id
  ) then
    raise exception 'You can only write to people in your Lokr';
  end if;

  select c.id into conversation_id
  from public.lokr_conversations c
  where c.workspace_id = workspace_id
    and exists (
      select 1 from public.lokr_conversation_members a
      where a.conversation_id = c.id and a.user_id = current_user_id
    )
    and exists (
      select 1 from public.lokr_conversation_members b
      where b.conversation_id = c.id and b.user_id = p_other_user_id
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

  return public.lokr_create_conversation(null, array[p_other_user_id]);
end;
$$;

revoke all on function public.lokr_start_call(uuid) from public, anon;
revoke all on function public.lokr_ensure_direct_conversation(uuid) from public, anon;
grant execute on function public.lokr_start_call(uuid) to authenticated;
grant execute on function public.lokr_ensure_direct_conversation(uuid) to authenticated;

grant select, insert, update on public.lokr_calls to authenticated;
grant select, insert, update, delete on public.lokr_distribution_lists to authenticated;
grant select, insert, delete on public.lokr_distribution_list_members to authenticated;
