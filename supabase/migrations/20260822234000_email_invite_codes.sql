-- Private invites require the invited email plus a code.
-- A share is not an invite. Sample lockers cannot issue these.

create table if not exists public.lokr_email_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lokr_workspaces (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  email text not null,
  email_hint text not null,
  token text not null,
  token_hash text not null,
  status text not null default 'pending',
  otp_hash text,
  otp_display text,
  otp_expires_at timestamptz,
  otp_sent_at timestamptz,
  otp_attempts integer not null default 0,
  email_attempts integer not null default 0,
  email_confirmed_at timestamptz,
  join_ticket uuid,
  join_ticket_expires_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  constraint lokr_email_invites_email_check check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  constraint lokr_email_invites_status_check check (
    status in ('pending', 'awaiting_code', 'confirmed', 'accepted', 'revoked')
  )
);

create unique index if not exists lokr_email_invites_token_hash_idx
  on public.lokr_email_invites (token_hash);
create unique index if not exists lokr_email_invites_token_idx
  on public.lokr_email_invites (token);
create unique index if not exists lokr_email_invites_ticket_idx
  on public.lokr_email_invites (join_ticket)
  where join_ticket is not null;
create unique index if not exists lokr_email_invites_open_email_idx
  on public.lokr_email_invites (workspace_id, email)
  where status in ('pending', 'awaiting_code', 'confirmed');
create index if not exists lokr_email_invites_workspace_idx
  on public.lokr_email_invites (workspace_id, created_at desc);

alter table public.lokr_email_invites enable row level security;
alter table public.lokr_email_invites force row level security;

drop policy if exists "lokr members read email invites" on public.lokr_email_invites;
create policy "lokr members read email invites"
  on public.lokr_email_invites for select to authenticated
  using (private.lokr_is_workspace_member(workspace_id));

revoke all on table public.lokr_email_invites from anon, authenticated, public;
grant select on table public.lokr_email_invites to authenticated;

create or replace function public.lokr_create_email_invite(
  p_workspace_id uuid,
  p_email text,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_plan text;
  seat_max integer;
  member_count integer;
  pending_count integer;
  email text;
  hint text;
  token_hash text;
  invite_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_workspace_id is null or p_token is null or char_length(p_token) < 16 then
    raise exception 'That invite could not be created';
  end if;

  if public.lokr_sample_workspace_id() is not distinct from p_workspace_id then
    raise exception 'This locker uses shares, not invites.';
  end if;

  email := lower(btrim(coalesce(p_email, '')));
  if email = '' or email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter the email to invite.';
  end if;
  hint := left(split_part(email, '@', 1), 1) || '•••@' || split_part(email, '@', 2);

  if not exists (
    select 1
    from public.lokr_workspaces w
    where w.id = p_workspace_id
      and (
        w.created_by = current_user_id
        or exists (
          select 1 from public.lokr_workspace_members m
          where m.workspace_id = p_workspace_id
            and m.user_id = current_user_id
            and m.role = 'admin'
        )
      )
  ) then
    raise exception 'Only an admin can invite people to this Lokr';
  end if;

  select w.plan into workspace_plan
  from public.lokr_workspaces w
  where w.id = p_workspace_id;

  seat_max := private.lokr_invite_seat_max(workspace_plan);

  select count(*) into member_count
  from public.lokr_workspace_members m
  where m.workspace_id = p_workspace_id;

  select
    (select count(*) from public.lokr_phone_invites i
      where i.workspace_id = p_workspace_id
        and i.status in ('pending', 'awaiting_code', 'confirmed')
        and i.expires_at > now())
    +
    (select count(*) from public.lokr_email_invites e
      where e.workspace_id = p_workspace_id
        and e.status in ('pending', 'awaiting_code', 'confirmed')
        and e.expires_at > now())
  into pending_count;

  if seat_max is not null and (member_count + pending_count) >= seat_max then
    raise exception 'This group is at its invite limit. Upgrade this group to invite more.';
  end if;

  if exists (
    select 1 from public.lokr_email_invites i
    where i.workspace_id = p_workspace_id
      and i.email = email
      and i.status in ('pending', 'awaiting_code', 'confirmed')
  ) then
    raise exception 'That email already has an open invite to this Lokr';
  end if;

  token_hash := private.lokr_token_hash(p_token);

  insert into public.lokr_email_invites (
    workspace_id, invited_by, email, email_hint, token, token_hash
  )
  values (p_workspace_id, current_user_id, email, hint, p_token, token_hash)
  returning id into invite_id;

  return jsonb_build_object('ok', true, 'id', invite_id);
end;
$$;

create or replace function public.lokr_peek_email_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_email_invites%rowtype;
  inviter_name text;
  workspace_name text;
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return jsonb_build_object('ok', false);
  end if;

  select * into invite
  from public.lokr_email_invites i
  where i.token_hash = private.lokr_token_hash(btrim(p_token));

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if invite.status = 'revoked' or invite.expires_at <= now() then
    return jsonb_build_object('ok', false, 'expired', true);
  end if;

  if invite.status = 'accepted' then
    return jsonb_build_object('ok', false, 'used', true);
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), 'Someone')
  into inviter_name
  from public.profiles p
  where p.id = invite.invited_by;

  select w.name into workspace_name
  from public.lokr_workspaces w
  where w.id = invite.workspace_id;

  return jsonb_build_object(
    'ok', true,
    'kind', 'email',
    'inviter_name', coalesce(inviter_name, 'Someone'),
    'workspace_name', coalesce(workspace_name, 'My Lokr'),
    'email_hint', invite.email_hint,
    'status', invite.status
  );
end;
$$;

create or replace function public.lokr_confirm_invite_email(
  p_token text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_email_invites%rowtype;
  email text;
  otp_code text;
  fail jsonb := jsonb_build_object(
    'ok', false,
    'error', 'That is not the email this invite was sent to.'
  );
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return fail;
  end if;

  email := lower(btrim(coalesce(p_email, '')));
  if email = '' or email !~ '^[^@]+@[^@]+\.[^@]+$' then
    return fail;
  end if;

  select * into invite
  from public.lokr_email_invites i
  where i.token_hash = private.lokr_token_hash(btrim(p_token))
  for update;

  if not found
    or invite.status in ('accepted', 'revoked')
    or invite.expires_at <= now()
  then
    return fail;
  end if;

  if invite.email_attempts >= 12 then
    return fail;
  end if;

  if invite.email is distinct from email then
    update public.lokr_email_invites
    set email_attempts = email_attempts + 1
    where id = invite.id;
    return fail;
  end if;

  if invite.otp_sent_at is not null and invite.otp_sent_at > now() - interval '45 seconds' then
    return jsonb_build_object('ok', true, 'wait', true);
  end if;

  if coalesce(invite.otp_attempts, 0) >= 8 and invite.status = 'awaiting_code' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Too many tries. Ask the person who invited you to send a new invite.'
    );
  end if;

  otp_code := lpad((floor(100000 + random() * 900000))::int::text, 6, '0');

  update public.lokr_email_invites
  set
    status = 'awaiting_code',
    otp_hash = private.lokr_otp_hash(otp_code, invite.token_hash),
    otp_display = otp_code,
    otp_expires_at = now() + interval '15 minutes',
    otp_sent_at = now(),
    otp_attempts = 0
  where id = invite.id;

  return jsonb_build_object('ok', true, 'wait', false);
end;
$$;

create or replace function public.lokr_verify_email_invite_otp(
  p_token text,
  p_otp text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_email_invites%rowtype;
  code text;
  ticket uuid;
  fail jsonb := jsonb_build_object(
    'ok', false,
    'error', 'That code did not match. It must be the code sent to the invited email.'
  );
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return fail;
  end if;

  code := nullif(regexp_replace(coalesce(p_otp, ''), '[^0-9]', '', 'g'), '');
  if code is null or char_length(code) <> 6 then
    return fail;
  end if;

  select * into invite
  from public.lokr_email_invites i
  where i.token_hash = private.lokr_token_hash(btrim(p_token))
  for update;

  if not found
    or invite.status in ('accepted', 'revoked', 'pending')
    or invite.expires_at <= now()
  then
    return fail;
  end if;

  if invite.status = 'confirmed'
    and invite.join_ticket is not null
    and invite.join_ticket_expires_at > now()
  then
    return jsonb_build_object('ok', true, 'ticket', invite.join_ticket);
  end if;

  if invite.otp_hash is null
    or invite.otp_expires_at is null
    or invite.otp_expires_at <= now()
  then
    return jsonb_build_object(
      'ok', false,
      'error', 'That code expired. Enter the email again for a new code.'
    );
  end if;

  if invite.otp_attempts >= 8 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Too many tries. Ask the person who invited you to send a new invite.'
    );
  end if;

  if invite.otp_hash is distinct from private.lokr_otp_hash(code, invite.token_hash) then
    update public.lokr_email_invites
    set otp_attempts = otp_attempts + 1
    where id = invite.id;
    return fail;
  end if;

  ticket := gen_random_uuid();

  update public.lokr_email_invites
  set
    status = 'confirmed',
    email_confirmed_at = now(),
    join_ticket = ticket,
    join_ticket_expires_at = now() + interval '7 days',
    otp_display = null,
    otp_hash = null
  where id = invite.id;

  return jsonb_build_object('ok', true, 'ticket', ticket);
end;
$$;

create or replace function public.lokr_accept_email_invite(p_ticket text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  invite public.lokr_email_invites%rowtype;
  seat_max integer;
  member_count integer;
  workspace_plan text;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_ticket is null or p_ticket !~ '^[0-9a-f-]{36}$' then
    raise exception 'This join was not confirmed from the invited email';
  end if;

  select * into invite
  from public.lokr_email_invites i
  where i.join_ticket = p_ticket::uuid
  for update;

  if not found
    or invite.status not in ('confirmed', 'accepted')
    or invite.email_confirmed_at is null
    or invite.join_ticket_expires_at is null
    or invite.join_ticket_expires_at <= now()
    or invite.expires_at <= now()
  then
    raise exception 'This join was not confirmed from the invited email';
  end if;

  if invite.status = 'accepted' then
    if invite.accepted_user_id = current_user_id then
      return jsonb_build_object('ok', true, 'workspace_id', invite.workspace_id);
    end if;
    raise exception 'This invite was already used';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id
      and lower(btrim(coalesce(p.email, ''))) = invite.email
  ) then
    raise exception 'Sign in with the invited email to join this locker';
  end if;

  if exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = invite.workspace_id
      and m.user_id = current_user_id
  ) then
    update public.lokr_email_invites
    set status = 'accepted', accepted_at = now(), accepted_user_id = current_user_id
    where id = invite.id;
    return jsonb_build_object('ok', true, 'workspace_id', invite.workspace_id);
  end if;

  select w.plan into workspace_plan
  from public.lokr_workspaces w
  where w.id = invite.workspace_id;

  seat_max := private.lokr_invite_seat_max(workspace_plan);

  select count(*) into member_count
  from public.lokr_workspace_members m
  where m.workspace_id = invite.workspace_id;

  if seat_max is not null and member_count >= seat_max then
    raise exception 'This group is full';
  end if;

  insert into public.lokr_workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, current_user_id, 'member');

  update public.lokr_email_invites
  set status = 'accepted', accepted_at = now(), accepted_user_id = current_user_id
  where id = invite.id;

  return jsonb_build_object('ok', true, 'workspace_id', invite.workspace_id);
end;
$$;

create or replace function public.lokr_accept_email_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_email_invites%rowtype;
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    raise exception 'This join was not confirmed from the invited email';
  end if;

  select * into invite
  from public.lokr_email_invites i
  where i.token_hash = private.lokr_token_hash(btrim(p_token))
  for update;

  if not found or invite.join_ticket is null then
    raise exception 'This join was not confirmed from the invited email';
  end if;

  return public.lokr_accept_email_invite(invite.join_ticket::text);
end;
$$;

revoke all on function public.lokr_create_email_invite(uuid, text, text) from public, anon;
revoke all on function public.lokr_peek_email_invite(text) from public;
revoke all on function public.lokr_confirm_invite_email(text, text) from public;
revoke all on function public.lokr_verify_email_invite_otp(text, text) from public;
revoke all on function public.lokr_accept_email_invite(text) from public, anon;
revoke all on function public.lokr_accept_email_invite_by_token(text) from public, anon;

grant execute on function public.lokr_create_email_invite(uuid, text, text) to authenticated;
grant execute on function public.lokr_peek_email_invite(text) to anon, authenticated;
grant execute on function public.lokr_confirm_invite_email(text, text) to anon, authenticated;
grant execute on function public.lokr_verify_email_invite_otp(text, text) to anon, authenticated;
grant execute on function public.lokr_accept_email_invite(text) to authenticated;
grant execute on function public.lokr_accept_email_invite_by_token(text) to authenticated;

-- Phone invites must count email pending seats, and cannot run on the sample locker.
create or replace function public.lokr_create_phone_invite(
  p_workspace_id uuid,
  p_phone_e164 text,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  workspace_plan text;
  seat_max integer;
  member_count integer;
  pending_count integer;
  phone text;
  last4 text;
  token_hash text;
  invite_id uuid;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_workspace_id is null or p_token is null or char_length(p_token) < 16 then
    raise exception 'That invite could not be created';
  end if;

  if public.lokr_sample_workspace_id() is not distinct from p_workspace_id then
    raise exception 'This locker uses shares, not invites.';
  end if;

  phone := nullif(btrim(p_phone_e164), '');
  if phone is null or phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Enter a valid phone number';
  end if;
  last4 := right(phone, 4);

  if not exists (
    select 1
    from public.lokr_workspaces w
    where w.id = p_workspace_id
      and (
        w.created_by = current_user_id
        or exists (
          select 1 from public.lokr_workspace_members m
          where m.workspace_id = p_workspace_id
            and m.user_id = current_user_id
            and m.role = 'admin'
        )
      )
  ) then
    raise exception 'Only an admin can invite people to this Lokr';
  end if;

  select w.plan into workspace_plan
  from public.lokr_workspaces w
  where w.id = p_workspace_id;

  seat_max := private.lokr_invite_seat_max(workspace_plan);

  select count(*) into member_count
  from public.lokr_workspace_members m
  where m.workspace_id = p_workspace_id;

  select
    (select count(*) from public.lokr_phone_invites i
      where i.workspace_id = p_workspace_id
        and i.status in ('pending', 'awaiting_code', 'confirmed')
        and i.expires_at > now())
    +
    (select count(*) from public.lokr_email_invites e
      where e.workspace_id = p_workspace_id
        and e.status in ('pending', 'awaiting_code', 'confirmed')
        and e.expires_at > now())
  into pending_count;

  if seat_max is not null and (member_count + pending_count) >= seat_max then
    raise exception 'This group is at its invite limit. Upgrade this group to invite more.';
  end if;

  if exists (
    select 1 from public.lokr_phone_invites i
    where i.workspace_id = p_workspace_id
      and i.phone_e164 = phone
      and i.status in ('pending', 'awaiting_code', 'confirmed')
  ) then
    raise exception 'That number already has an open invite to this Lokr';
  end if;

  token_hash := private.lokr_token_hash(p_token);

  insert into public.lokr_phone_invites (
    workspace_id, invited_by, phone_e164, phone_last4, token, token_hash
  )
  values (p_workspace_id, current_user_id, phone, last4, p_token, token_hash)
  returning id into invite_id;

  return jsonb_build_object('ok', true, 'id', invite_id);
end;
$$;

