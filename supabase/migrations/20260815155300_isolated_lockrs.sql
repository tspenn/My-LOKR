-- Up to 4 isolated Lockrs per account. Inbox, new threads, and uploads
-- stay inside the Lokr you opened. Spaces cannot see each other.

create or replace function public.lokr_guard_lockr_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.lokr_workspace_members m
    where m.user_id = new.user_id
  ) >= 4 then
    raise exception 'You can belong to at most 4 Lockrs';
  end if;
  return new;
end;
$$;

drop trigger if exists lokr_workspace_members_cap on public.lokr_workspace_members;
create trigger lokr_workspace_members_cap
before insert on public.lokr_workspace_members
for each row
execute function public.lokr_guard_lockr_cap();

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
  lockr_count integer;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select count(*) into lockr_count
  from public.lokr_workspace_members m
  where m.user_id = current_user_id;

  if lockr_count >= 4 then
    raise exception 'You can belong to at most 4 Lockrs';
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

drop function if exists public.lokr_create_conversation(text, uuid[]);
drop function if exists public.lokr_get_inbox();
drop function if exists public.lokr_can_upload(bigint);
drop function if exists public.lokr_ensure_direct_conversation(uuid);

create function public.lokr_create_conversation(
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
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_workspace_id is null then
    raise exception 'Choose a Lokr first';
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = current_user_id
  ) then
    raise exception 'You are not in that Lokr';
  end if;

  select coalesce(array_agg(distinct id), '{}')
  into unique_ids
  from unnest(coalesce(p_member_ids, '{}')) as id
  where id is not null
    and id <> current_user_id;

  if unique_ids is null or cardinality(unique_ids) < 1 then
    raise exception 'Choose at least one other person';
  end if;

  if exists (
    select 1 from unnest(unique_ids) as id
    where not exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = p_workspace_id and m.user_id = id
    )
  ) then
    raise exception 'You can only write to people in this Lokr';
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

create function public.lokr_get_inbox(p_workspace_id uuid)
returns table (
  id uuid,
  subject text,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_body text,
  last_message_at timestamptz,
  unread_count integer,
  members jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.subject,
    c.created_at,
    c.updated_at,
    lm.body,
    lm.created_at,
    (
      select count(*)::integer
      from public.lokr_messages as m
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and m.created_at > coalesce(my_cm.last_read_at, '1970-01-01'::timestamptz)
    ) as unread_count,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'display_name', coalesce(p.full_name, p.email),
            'email', p.email,
            'avatar_url', p.avatar_url
          )
          order by coalesce(p.full_name, p.email)
        ),
        '[]'::jsonb
      )
      from public.lokr_conversation_members as cm
      join public.profiles as p on p.id = cm.user_id
      where cm.conversation_id = c.id
    ) as members
  from public.lokr_conversations as c
  join public.lokr_conversation_members as my_cm
    on my_cm.conversation_id = c.id
   and my_cm.user_id = (select auth.uid())
  left join lateral (
    select m.body, m.created_at
    from public.lokr_messages as m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as lm on true
  where c.workspace_id = p_workspace_id
  order by c.updated_at desc;
$$;

create function public.lokr_can_upload(p_additional_bytes bigint, p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  used bigint;
  limit_bytes bigint;
begin
  if p_workspace_id is null then
    return false;
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
  ) then
    return false;
  end if;

  select storage_used_bytes into used from public.lokr_workspaces where id = p_workspace_id;
  limit_bytes := public.lokr_storage_limit_bytes(p_workspace_id);
  return coalesce(used, 0) + coalesce(p_additional_bytes, 0) <= limit_bytes;
end;
$$;

create function public.lokr_ensure_direct_conversation(
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
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;
  if p_other_user_id is null or p_other_user_id = current_user_id then
    raise exception 'Choose someone else';
  end if;
  if p_workspace_id is null then
    raise exception 'Choose a Lokr first';
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = current_user_id
  ) then
    raise exception 'You are not in that Lokr';
  end if;

  if not exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = p_other_user_id
  ) then
    raise exception 'You can only write to people in this Lokr';
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

  return public.lokr_create_conversation(null, array[p_other_user_id], p_workspace_id);
end;
$$;

revoke all on function public.lokr_create_conversation(text, uuid[], uuid) from public, anon;
revoke all on function public.lokr_get_inbox(uuid) from public, anon;
revoke all on function public.lokr_can_upload(bigint, uuid) from public, anon;
revoke all on function public.lokr_ensure_direct_conversation(uuid, uuid) from public, anon;
grant execute on function public.lokr_create_conversation(text, uuid[], uuid) to authenticated;
grant execute on function public.lokr_get_inbox(uuid) to authenticated;
grant execute on function public.lokr_can_upload(bigint, uuid) to authenticated;
grant execute on function public.lokr_ensure_direct_conversation(uuid, uuid) to authenticated;
