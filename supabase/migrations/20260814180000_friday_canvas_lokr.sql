-- My Lokr on Friday Canvas.
-- Prefixed tables so they do not collide with existing public.profiles / public.messages.

insert into public.apps (app_key, name)
values ('my_lokr', 'My Lokr')
on conflict (app_key) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Workspaces (personal vs business) and membership
-- ---------------------------------------------------------------------------
create table if not exists public.lokr_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null default 'personal',
  logo_path text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  plan text not null default 'free',
  vault_addon text not null default 'none',
  storage_used_bytes bigint not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  vault_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lokr_workspaces_account_type_check check (account_type in ('personal', 'business')),
  constraint lokr_workspaces_plan_check check (plan in ('free', 'business', 'enterprise')),
  constraint lokr_workspaces_vault_check check (vault_addon in ('none', '50', '100', '250')),
  constraint lokr_workspaces_name_not_blank check (char_length(btrim(name)) > 0)
);

create table if not exists public.lokr_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lokr_workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  constraint lokr_workspace_members_unique unique (workspace_id, user_id),
  constraint lokr_workspace_members_role_check check (role in ('member', 'admin'))
);

create table if not exists public.lokr_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lokr_workspaces (id) on delete cascade,
  subject text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lokr_conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.lokr_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  constraint lokr_conversation_members_unique unique (conversation_id, user_id),
  constraint lokr_conversation_members_role_check check (role in ('member', 'admin'))
);

create table if not exists public.lokr_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.lokr_conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lokr_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.lokr_messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint lokr_attachments_size_positive check (size_bytes > 0),
  constraint lokr_attachments_size_limit check (size_bytes <= 20971520)
);

create index if not exists lokr_workspace_members_user_id_idx on public.lokr_workspace_members (user_id);
create index if not exists lokr_workspace_members_workspace_id_idx on public.lokr_workspace_members (workspace_id);
create index if not exists lokr_conversation_members_user_id_idx on public.lokr_conversation_members (user_id);
create index if not exists lokr_conversation_members_conversation_id_idx on public.lokr_conversation_members (conversation_id);
create index if not exists lokr_messages_conversation_id_created_at_idx on public.lokr_messages (conversation_id, created_at);
create index if not exists lokr_message_attachments_message_id_idx on public.lokr_message_attachments (message_id);
create index if not exists lokr_conversations_workspace_updated_idx on public.lokr_conversations (workspace_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Privileged helpers (existing private schema on Friday Canvas)
-- ---------------------------------------------------------------------------
create or replace function private.lokr_is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lokr_workspace_members as m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.lokr_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lokr_conversation_members as cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function private.lokr_set_updated_at()
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

drop trigger if exists lokr_workspaces_set_updated_at on public.lokr_workspaces;
create trigger lokr_workspaces_set_updated_at
  before update on public.lokr_workspaces
  for each row execute function private.lokr_set_updated_at();

drop trigger if exists lokr_conversations_set_updated_at on public.lokr_conversations;
create trigger lokr_conversations_set_updated_at
  before update on public.lokr_conversations
  for each row execute function private.lokr_set_updated_at();

drop trigger if exists lokr_messages_set_updated_at on public.lokr_messages;
create trigger lokr_messages_set_updated_at
  before update on public.lokr_messages
  for each row execute function private.lokr_set_updated_at();

create or replace function private.lokr_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lokr_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists lokr_messages_touch_conversation on public.lokr_messages;
create trigger lokr_messages_touch_conversation
  after insert on public.lokr_messages
  for each row execute function private.lokr_touch_conversation();

create or replace function private.lokr_refresh_storage_used()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  select c.workspace_id into ws
  from public.lokr_messages as m
  join public.lokr_conversations as c on c.id = m.conversation_id
  where m.id = coalesce(new.message_id, old.message_id);

  if ws is not null then
    update public.lokr_workspaces w
    set storage_used_bytes = coalesce((
      select sum(a.size_bytes)
      from public.lokr_message_attachments as a
      join public.lokr_messages as m on m.id = a.message_id
      join public.lokr_conversations as c on c.id = m.conversation_id
      where c.workspace_id = ws
    ), 0)
    where w.id = ws;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists lokr_attachments_storage_ins on public.lokr_message_attachments;
create trigger lokr_attachments_storage_ins
  after insert on public.lokr_message_attachments
  for each row execute function private.lokr_refresh_storage_used();

drop trigger if exists lokr_attachments_storage_del on public.lokr_message_attachments;
create trigger lokr_attachments_storage_del
  after delete on public.lokr_message_attachments
  for each row execute function private.lokr_refresh_storage_used();

-- ---------------------------------------------------------------------------
-- Create workspace (personal or business) + first admin
-- ---------------------------------------------------------------------------
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

  if exists (
    select 1 from public.lokr_workspace_members m
    where m.user_id = current_user_id
  ) then
    raise exception 'You already belong to a Lokr';
  end if;

  insert into public.lokr_workspaces (name, account_type, created_by, plan)
  values (nullif(btrim(coalesce(p_name, '')), ''), account, current_user_id, 'free')
  returning id into workspace_id;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'admin');

  return workspace_id;
end;
$$;

create or replace function public.lokr_create_conversation(
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
  workspace_id uuid;
  conversation_id uuid;
  member_id uuid;
  unique_ids uuid[];
  member_count integer;
  plan text;
  max_users integer;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select wm.workspace_id, w.plan
  into workspace_id, plan
  from public.lokr_workspace_members wm
  join public.lokr_workspaces w on w.id = wm.workspace_id
  where wm.user_id = current_user_id
  limit 1;

  if workspace_id is null then
    raise exception 'Set up your Lokr first';
  end if;

  select coalesce(array_agg(distinct id), '{}')
  into unique_ids
  from unnest(coalesce(p_member_ids, '{}')) as id
  where id is not null
    and id <> current_user_id;

  if unique_ids is null or cardinality(unique_ids) < 1 then
    raise exception 'Choose at least one other person';
  end if;

  -- Recipients must already be in this workspace.
  if exists (
    select 1 from unnest(unique_ids) as id
    where not exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = workspace_id and m.user_id = id
    )
  ) then
    raise exception 'You can only write to people in your Lokr';
  end if;

  insert into public.lokr_conversations (workspace_id, subject, created_by)
  values (workspace_id, nullif(btrim(coalesce(p_subject, '')), ''), current_user_id)
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

create or replace function public.lokr_get_inbox()
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
  order by c.updated_at desc;
$$;

create or replace function public.lokr_storage_limit_bytes(p_workspace_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
    case w.plan
      when 'free' then 1073741824::bigint
      when 'business' then 53687091200::bigint
      else 1099511627776::bigint
    end
    + case w.vault_addon
      when '50' then 53687091200::bigint
      when '100' then 107374182400::bigint
      when '250' then 268435456000::bigint
      else 0
    end
  from public.lokr_workspaces w
  where w.id = p_workspace_id;
$$;

create or replace function public.lokr_can_upload(p_additional_bytes bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ws uuid;
  used bigint;
  limit_bytes bigint;
begin
  select workspace_id into ws
  from public.lokr_workspace_members
  where user_id = (select auth.uid())
  limit 1;

  if ws is null then
    return false;
  end if;

  select storage_used_bytes into used from public.lokr_workspaces where id = ws;
  limit_bytes := public.lokr_storage_limit_bytes(ws);
  return coalesce(used, 0) + coalesce(p_additional_bytes, 0) <= limit_bytes;
end;
$$;

revoke all on function public.lokr_create_workspace(text, text) from public, anon;
revoke all on function public.lokr_create_conversation(text, uuid[]) from public, anon;
revoke all on function public.lokr_get_inbox() from public, anon;
revoke all on function public.lokr_storage_limit_bytes(uuid) from public, anon;
revoke all on function public.lokr_can_upload(bigint) from public, anon;
grant execute on function public.lokr_create_workspace(text, text) to authenticated;
grant execute on function public.lokr_create_conversation(text, uuid[]) to authenticated;
grant execute on function public.lokr_get_inbox() to authenticated;
grant execute on function public.lokr_storage_limit_bytes(uuid) to authenticated;
grant execute on function public.lokr_can_upload(bigint) to authenticated;
grant execute on function private.lokr_is_workspace_member(uuid) to authenticated;
grant execute on function private.lokr_is_conversation_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.lokr_workspaces enable row level security;
alter table public.lokr_workspace_members enable row level security;
alter table public.lokr_conversations enable row level security;
alter table public.lokr_conversation_members enable row level security;
alter table public.lokr_messages enable row level security;
alter table public.lokr_message_attachments enable row level security;

alter table public.lokr_workspaces force row level security;
alter table public.lokr_workspace_members force row level security;
alter table public.lokr_conversations force row level security;
alter table public.lokr_conversation_members force row level security;
alter table public.lokr_messages force row level security;
alter table public.lokr_message_attachments force row level security;

drop policy if exists "lokr members read workspace" on public.lokr_workspaces;
create policy "lokr members read workspace"
  on public.lokr_workspaces for select to authenticated
  using (private.lokr_is_workspace_member(id) or created_by = (select auth.uid()));

drop policy if exists "lokr creators insert workspace" on public.lokr_workspaces;
create policy "lokr creators insert workspace"
  on public.lokr_workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "lokr admins update workspace" on public.lokr_workspaces;
create policy "lokr admins update workspace"
  on public.lokr_workspaces for update to authenticated
  using (
    exists (
      select 1 from public.lokr_workspace_members m
      where m.workspace_id = id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

drop policy if exists "lokr members read workspace members" on public.lokr_workspace_members;
create policy "lokr members read workspace members"
  on public.lokr_workspace_members for select to authenticated
  using (user_id = (select auth.uid()) or private.lokr_is_workspace_member(workspace_id));

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
      where m.workspace_id = workspace_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

drop policy if exists "lokr users leave workspace" on public.lokr_workspace_members;
create policy "lokr users leave workspace"
  on public.lokr_workspace_members for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "lokr members read conversations" on public.lokr_conversations;
create policy "lokr members read conversations"
  on public.lokr_conversations for select to authenticated
  using (
    created_by = (select auth.uid())
    or private.lokr_is_conversation_member(id)
  );

drop policy if exists "lokr members create conversations" on public.lokr_conversations;
create policy "lokr members create conversations"
  on public.lokr_conversations for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.lokr_is_workspace_member(workspace_id)
  );

drop policy if exists "lokr members read conversation members" on public.lokr_conversation_members;
create policy "lokr members read conversation members"
  on public.lokr_conversation_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.lokr_is_conversation_member(conversation_id)
  );

drop policy if exists "lokr creators add conversation members" on public.lokr_conversation_members;
create policy "lokr creators add conversation members"
  on public.lokr_conversation_members for insert to authenticated
  with check (
    exists (
      select 1 from public.lokr_conversations c
      where c.id = conversation_id and c.created_by = (select auth.uid())
    )
  );

drop policy if exists "lokr users update own conversation membership" on public.lokr_conversation_members;
create policy "lokr users update own conversation membership"
  on public.lokr_conversation_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "lokr users leave conversations" on public.lokr_conversation_members;
create policy "lokr users leave conversations"
  on public.lokr_conversation_members for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "lokr members read messages" on public.lokr_messages;
create policy "lokr members read messages"
  on public.lokr_messages for select to authenticated
  using (private.lokr_is_conversation_member(conversation_id));

drop policy if exists "lokr members send messages" on public.lokr_messages;
create policy "lokr members send messages"
  on public.lokr_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.lokr_is_conversation_member(conversation_id)
  );

drop policy if exists "lokr members read attachments" on public.lokr_message_attachments;
create policy "lokr members read attachments"
  on public.lokr_message_attachments for select to authenticated
  using (
    exists (
      select 1 from public.lokr_messages m
      where m.id = message_id
        and private.lokr_is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "lokr senders add attachments" on public.lokr_message_attachments;
create policy "lokr senders add attachments"
  on public.lokr_message_attachments for insert to authenticated
  with check (
    exists (
      select 1 from public.lokr_messages m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and private.lokr_is_conversation_member(m.conversation_id)
    )
  );

grant select, insert, update on public.lokr_workspaces to authenticated;
grant select, insert, delete on public.lokr_workspace_members to authenticated;
grant select, insert on public.lokr_conversations to authenticated;
grant select, insert, update, delete on public.lokr_conversation_members to authenticated;
grant select, insert on public.lokr_messages to authenticated;
grant select, insert on public.lokr_message_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lokr-attachments',
  'lokr-attachments',
  false,
  20971520,
  array[
    'image/jpeg','image/png','image/gif','image/webp','application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lokr-logos',
  'lokr-logos',
  false,
  2097152,
  array['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lokr members upload attachments" on storage.objects;
create policy "lokr members upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lokr-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.lokr_is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lokr members read attachments files" on storage.objects;
create policy "lokr members read attachments files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lokr-attachments'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.lokr_is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lokr members upload logos" on storage.objects;
create policy "lokr members upload logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lokr-logos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.lokr_is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lokr members update logos" on storage.objects;
create policy "lokr members update logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'lokr-logos'
    and private.lokr_is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lokr members read logos" on storage.objects;
create policy "lokr members read logos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lokr-logos'
    and private.lokr_is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

alter table public.lokr_messages replica identity full;
alter table public.lokr_message_attachments replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.lokr_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.lokr_message_attachments;
  exception when duplicate_object then null;
  end;
end;
$$;

insert into public.subscription_tiers (
  app_key, name, price_monthly, credits_included, has_ai_access, features, stripe_price_id_monthly
)
values
  (
    'my_lokr', 'Free', 0, 0, false,
    '{"key":"free","max_users":4,"storage_gb":1,"ads":false,"blurb":"Personal use and testing only. A locked space for a handful of people."}'::jsonb,
    null
  ),
  (
    'my_lokr', 'Business', 19, 0, false,
    '{"key":"business","max_users":15,"storage_gb":50,"per_user":true,"ads":false,"blurb":"Small teams who need a private side channel for proprietary work."}'::jsonb,
    null
  ),
  (
    'my_lokr', 'Enterprise', 0, 0, false,
    '{"key":"enterprise","custom":true,"ads":false,"blurb":"Larger or highly sensitive organizations. Users, storage, and terms are set one company at a time."}'::jsonb,
    null
  ),
  (
    'my_lokr', 'The Vault 50 GB', 7, 0, false,
    '{"key":"vault_50","addon":true,"storage_gb":50,"blurb":"Extra private storage for any plan."}'::jsonb,
    null
  ),
  (
    'my_lokr', 'The Vault 100 GB', 12, 0, false,
    '{"key":"vault_100","addon":true,"storage_gb":100,"blurb":"Extra private storage for any plan."}'::jsonb,
    null
  ),
  (
    'my_lokr', 'The Vault 250 GB', 25, 0, false,
    '{"key":"vault_250","addon":true,"storage_gb":250,"blurb":"Extra private storage for any plan."}'::jsonb,
    null
  )
on conflict do nothing;
