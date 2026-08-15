-- Bind the verified invite phone to the account so they can sign in
-- with email or that number (same password). No SMS needed after join.

create table if not exists public.lokr_user_phones (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone_e164 text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint lokr_user_phones_e164_check check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create unique index if not exists lokr_user_phones_phone_idx
  on public.lokr_user_phones (phone_e164);

alter table public.lokr_user_phones enable row level security;
alter table public.lokr_user_phones force row level security;

drop policy if exists "lokr users read own phone" on public.lokr_user_phones;
create policy "lokr users read own phone"
  on public.lokr_user_phones for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.lokr_user_phones from anon, authenticated, public;
grant select on table public.lokr_user_phones to authenticated;

create or replace function private.lokr_bind_verified_phone(p_user_id uuid, p_phone_e164 text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_phone_e164 is null or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    return;
  end if;
  insert into public.lokr_user_phones (user_id, phone_e164, verified_at)
  values (p_user_id, p_phone_e164, now())
  on conflict (user_id) do nothing;
exception
  when unique_violation then
    null;
end;
$$;

create or replace function public.lokr_email_for_verified_phone(p_phone_e164 text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone text;
  found_email text;
begin
  phone := nullif(btrim(p_phone_e164), '');
  if phone is null or phone !~ '^\+[1-9][0-9]{7,14}$' then
    return null;
  end if;

  select p.email into found_email
  from public.lokr_user_phones ph
  join public.profiles p on p.id = ph.user_id
  where ph.phone_e164 = phone;

  return nullif(btrim(found_email), '');
end;
$$;

create or replace function public.lokr_accept_phone_invite(p_ticket text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  invite public.lokr_phone_invites%rowtype;
  seat_max integer;
  member_count integer;
  workspace_plan text;
begin
  current_user_id := (select auth.uid());
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if p_ticket is null or p_ticket !~ '^[0-9a-f-]{36}$' then
    raise exception 'This join was not confirmed from the invited phone';
  end if;

  select * into invite
  from public.lokr_phone_invites i
  where i.join_ticket = p_ticket::uuid
  for update;

  if not found
    or invite.status not in ('confirmed', 'accepted')
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

insert into public.lokr_user_phones (user_id, phone_e164, verified_at)
select distinct on (i.accepted_user_id)
  i.accepted_user_id,
  i.phone_e164,
  coalesce(i.phone_confirmed_at, i.accepted_at, now())
from public.lokr_phone_invites i
where i.status = 'accepted'
  and i.accepted_user_id is not null
order by i.accepted_user_id, i.accepted_at nulls last
on conflict do nothing;

grant execute on function public.lokr_email_for_verified_phone(text) to anon, authenticated;
grant execute on function public.lokr_accept_phone_invite(text) to authenticated;
revoke execute on function public.lokr_accept_phone_invite(text) from anon, public;
