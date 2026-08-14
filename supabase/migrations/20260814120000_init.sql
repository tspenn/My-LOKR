-- My Lokr MVP schema: tables, indexes, RLS, storage, and helper functions.
-- Messages and files never leave this application. There is no SMTP or public bucket.

-- ---------------------------------------------------------------------------
-- Private schema for SECURITY DEFINER helpers
-- Keep privileged functions out of the exposed `public` schema.
-- ---------------------------------------------------------------------------
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Membership check used by RLS policies.
-- SECURITY DEFINER bypasses RLS on conversation_members so policies do not recurse.
create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members as cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

comment on function private.is_conversation_member(uuid) is
  'Returns true when the current auth user is a member of the given conversation. Used by RLS.';

revoke all on function private.is_conversation_member(uuid) from public, anon;
grant execute on function private.is_conversation_member(uuid) to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email),
  constraint profiles_display_name_not_blank check (char_length(btrim(display_name)) > 0)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  constraint conversation_members_unique unique (conversation_id, user_id),
  constraint conversation_members_role_check check (role in ('member', 'admin'))
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint message_attachments_size_positive check (size_bytes > 0),
  constraint message_attachments_size_limit check (size_bytes <= 20971520)
);

create index conversation_members_user_id_idx
  on public.conversation_members (user_id);

create index conversation_members_conversation_id_idx
  on public.conversation_members (conversation_id);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);

create index message_attachments_message_id_idx
  on public.message_attachments (message_id);

create index conversations_updated_at_idx
  on public.conversations (updated_at desc);

create index profiles_email_idx
  on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function private.set_updated_at();

-- Keep conversation activity order in sync with new messages.
create or replace function private.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.touch_conversation_from_message();

-- Create a profile row whenever a new auth user signs up.
-- display_name may be copied from signup metadata for convenience only.
-- Never use user_metadata for authorization decisions.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if chosen_name is null then
    chosen_name := split_part(coalesce(new.email, 'member'), '@', 1);
  end if;

  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), chosen_name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Conversation creation (controlled path for adding other members)
-- ---------------------------------------------------------------------------
create or replace function private.create_conversation(
  p_subject text,
  p_member_ids uuid[]
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
    raise exception 'You must be signed in to start a conversation';
  end if;

  -- Other participants only; the creator is always added as admin.
  select coalesce(array_agg(distinct id), '{}')
  into unique_ids
  from unnest(coalesce(p_member_ids, '{}')) as id
  where id is not null
    and id <> current_user_id;

  if unique_ids is null or cardinality(unique_ids) < 1 then
    raise exception 'Choose at least one other person';
  end if;

  if cardinality(unique_ids) > 7 then
    raise exception 'Small groups can include up to 8 people including you';
  end if;

  if exists (
    select 1
    from unnest(unique_ids) as id
    where not exists (select 1 from public.profiles p where p.id = id)
  ) then
    raise exception 'One or more people could not be found';
  end if;

  insert into public.conversations (subject, created_by)
  values (nullif(btrim(coalesce(p_subject, '')), ''), current_user_id)
  returning id into conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (conversation_id, current_user_id, 'admin');

  foreach member_id in array unique_ids
  loop
    insert into public.conversation_members (conversation_id, user_id, role)
    values (conversation_id, member_id, 'member');
  end loop;

  return conversation_id;
end;
$$;

-- Invoker wrapper so the client can call a public function.
-- The private function remains the privileged implementation.
create or replace function public.create_conversation(
  p_subject text,
  p_member_ids uuid[]
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_conversation(p_subject, p_member_ids);
$$;

comment on function public.create_conversation(text, uuid[]) is
  'Creates a conversation, adds the current user as admin, and adds the given members.';

revoke all on function public.create_conversation(text, uuid[]) from public, anon;
revoke all on function private.create_conversation(text, uuid[]) from public, anon;
grant execute on function public.create_conversation(text, uuid[]) to authenticated;
grant execute on function private.create_conversation(text, uuid[]) to authenticated;

-- Inbox list: last activity, preview, unread count, and members.
-- SECURITY INVOKER so RLS still applies to every table read.
create or replace function public.get_inbox()
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
      from public.messages as m
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and m.created_at > coalesce(my_cm.last_read_at, '1970-01-01'::timestamptz)
    ) as unread_count,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'display_name', p.display_name,
            'email', p.email,
            'avatar_url', p.avatar_url
          )
          order by p.display_name
        ),
        '[]'::jsonb
      )
      from public.conversation_members as cm
      join public.profiles as p on p.id = cm.user_id
      where cm.conversation_id = c.id
    ) as members
  from public.conversations as c
  join public.conversation_members as my_cm
    on my_cm.conversation_id = c.id
   and my_cm.user_id = (select auth.uid())
  left join lateral (
    select m.body, m.created_at
    from public.messages as m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as lm on true
  order by c.updated_at desc;
$$;

revoke all on function public.get_inbox() from public, anon;
grant execute on function public.get_inbox() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Wrap auth.uid() in a subquery so Postgres evaluates it once per query.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

alter table public.profiles force row level security;
alter table public.conversations force row level security;
alter table public.conversation_members force row level security;
alter table public.messages force row level security;
alter table public.message_attachments force row level security;

-- Profiles: anyone signed in can read display names; only you can update yours.
create policy "Authenticated users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Conversations: members (or the creator, so the first member insert can succeed).
create policy "Members can read their conversations"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_conversation_member(id)
  );

create policy "Authenticated users can create conversations"
  on public.conversations
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- conversation_members
create policy "Members can read membership of their conversations"
  on public.conversation_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_conversation_member(conversation_id)
  );

-- Direct inserts are limited to the conversation creator (the RPC is preferred).
create policy "Creators can add conversation members"
  on public.conversation_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.conversations as c
      where c.id = conversation_id
        and c.created_by = (select auth.uid())
    )
  );

create policy "Users can update their own membership"
  on public.conversation_members
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can leave conversations"
  on public.conversation_members
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Messages: members can read and send; no edits or deletes in MVP.
create policy "Members can read messages"
  on public.messages
  for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create policy "Members can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id)
  );

-- Attachments follow the parent message's conversation membership.
create policy "Members can read attachments"
  on public.message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages as m
      where m.id = message_id
        and private.is_conversation_member(m.conversation_id)
    )
  );

create policy "Senders can add attachments to their messages"
  on public.message_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages as m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and private.is_conversation_member(m.conversation_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from public, anon;
revoke all on table public.conversations from public, anon;
revoke all on table public.conversation_members from public, anon;
revoke all on table public.messages from public, anon;
revoke all on table public.message_attachments from public, anon;

grant select, update on table public.profiles to authenticated;
grant select, insert on table public.conversations to authenticated;
grant select, insert, update, delete on table public.conversation_members to authenticated;
grant select, insert on table public.messages to authenticated;
grant select, insert on table public.message_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private attachments bucket
-- Path: {conversation_id}/{message_id}/{uuid}-{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Members may upload and download only within folders named by conversation id.
create policy "Members can upload conversation attachments"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Members can download conversation attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime: new messages (and their attachments) without a page refresh
-- ---------------------------------------------------------------------------
alter table public.messages replica identity full;
alter table public.message_attachments replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.message_attachments;
  exception
    when duplicate_object then null;
  end;
end;
$$;
