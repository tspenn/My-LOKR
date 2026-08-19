-- Shared Friday Canvas profiles are own-only. Without a coworker read
-- policy, New message and Settings cannot show people who already joined.
drop policy if exists "lokr members can read coworker profiles" on public.profiles;
create policy "lokr members can read coworker profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lokr_workspace_members me
      join public.lokr_workspace_members them
        on them.workspace_id = me.workspace_id
      where me.user_id = (select auth.uid())
        and them.user_id = profiles.id
    )
  );

-- Finish a phone invite from the join-link token after email confirm.
-- The join-ticket cookie is often missing in a different browser (Gmail
-- in-app browser), even though the phone and code were already confirmed.

create or replace function private.lokr_finish_phone_invite(
  invite public.lokr_phone_invites
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  seat_max integer;
  member_count integer;
  workspace_plan text;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if invite.status not in ('confirmed', 'accepted')
    or invite.phone_confirmed_at is null
    or invite.join_ticket_expires_at is null
    or invite.join_ticket_expires_at <= now()
    or invite.expires_at <= now()
  then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  if invite.status = 'accepted' then
    if invite.accepted_user_id = current_user_id then
      perform private.lokr_bind_verified_phone(current_user_id, invite.phone_e164);
      return jsonb_build_object('ok', true, 'workspace_id', invite.workspace_id);
    end if;
    raise exception 'This invite was already used';
  end if;

  if exists (
    select 1 from public.lokr_workspace_members m
    where m.workspace_id = invite.workspace_id
      and m.user_id = current_user_id
  ) then
    update public.lokr_phone_invites
    set status = 'accepted', accepted_at = now(), accepted_user_id = current_user_id
    where id = invite.id;
    perform private.lokr_bind_verified_phone(current_user_id, invite.phone_e164);
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

  update public.lokr_phone_invites
  set status = 'accepted', accepted_at = now(), accepted_user_id = current_user_id
  where id = invite.id;

  perform private.lokr_bind_verified_phone(current_user_id, invite.phone_e164);

  return jsonb_build_object('ok', true, 'workspace_id', invite.workspace_id);
end;
$$;

create or replace function public.lokr_accept_phone_invite(p_ticket text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_phone_invites%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in';
  end if;

  if p_ticket is null or p_ticket !~ '^[0-9a-f-]{36}$' then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  select * into invite
  from public.lokr_phone_invites i
  where i.join_ticket = p_ticket::uuid
  for update;

  if not found then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  return private.lokr_finish_phone_invite(invite);
end;
$$;

create or replace function public.lokr_accept_phone_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.lokr_phone_invites%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in';
  end if;

  if p_token is null or char_length(btrim(p_token)) < 16 then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  select * into invite
  from public.lokr_phone_invites i
  where i.token_hash = private.lokr_token_hash(btrim(p_token))
  for update;

  if not found then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  return private.lokr_finish_phone_invite(invite);
end;
$$;

grant execute on function public.lokr_accept_phone_invite(text) to authenticated;
revoke execute on function public.lokr_accept_phone_invite(text) from anon, public;
grant execute on function public.lokr_accept_phone_invite_by_token(text) to authenticated;
revoke execute on function public.lokr_accept_phone_invite_by_token(text) from anon, public;
