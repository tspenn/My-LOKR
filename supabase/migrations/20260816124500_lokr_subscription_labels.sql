-- Free Lokr never wrote user_subscriptions, so the shared Canvas table
-- looked empty for this app. Record a distinct My Lokr plan name on signup
-- and Lockr join. Paid Stripe names stay prefixed so they do not collide
-- with other apps' "Free" / "Business" rows.

create or replace function private.lokr_ensure_free_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_plan text;
  email text;
  free_tier uuid;
begin
  if p_user_id is null then
    return;
  end if;

  select s.plan_name into existing_plan
  from public.user_subscriptions s
  where s.user_id = p_user_id
    and s.app_key = 'my_lokr';

  if existing_plan is not null
     and existing_plan is distinct from 'My Lokr Free' then
    return;
  end if;

  select p.email into email
  from public.profiles p
  where p.id = p_user_id;

  select t.id into free_tier
  from public.subscription_tiers t
  where t.app_key = 'my_lokr'
    and t.name = 'Free'
  limit 1;

  insert into public.user_subscriptions (
    user_id,
    app_key,
    plan_name,
    status,
    user_email,
    billing_cycle,
    expires_at,
    tier_id,
    updated_at
  )
  values (
    p_user_id,
    'my_lokr',
    'My Lokr Free',
    'free',
    email,
    'none',
    timestamptz '2099-01-01 00:00:00+00',
    free_tier,
    now()
  )
  on conflict (user_id, app_key) do update
    set
      plan_name = excluded.plan_name,
      status = excluded.status,
      user_email = coalesce(excluded.user_email, public.user_subscriptions.user_email),
      billing_cycle = excluded.billing_cycle,
      expires_at = excluded.expires_at,
      tier_id = coalesce(excluded.tier_id, public.user_subscriptions.tier_id),
      updated_at = now()
    where public.user_subscriptions.plan_name is not distinct from 'My Lokr Free'
       or public.user_subscriptions.plan_name is null;
end;
$$;

revoke all on function private.lokr_ensure_free_subscription(uuid) from public, anon, authenticated;

create or replace function private.lokr_touch_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lokr_ensure_free_subscription(new.user_id);
  return new;
end;
$$;

drop trigger if exists lokr_passwords_subscription on public.lokr_passwords;
create trigger lokr_passwords_subscription
after insert on public.lokr_passwords
for each row
execute function private.lokr_touch_subscription();

drop trigger if exists lokr_members_subscription on public.lokr_workspace_members;
create trigger lokr_members_subscription
after insert on public.lokr_workspace_members
for each row
execute function private.lokr_touch_subscription();

insert into public.user_subscriptions (
  user_id,
  app_key,
  plan_name,
  status,
  user_email,
  billing_cycle,
  expires_at,
  tier_id,
  updated_at
)
select
  people.user_id,
  'my_lokr',
  'My Lokr Free',
  'free',
  p.email,
  'none',
  timestamptz '2099-01-01 00:00:00+00',
  (
    select t.id
    from public.subscription_tiers t
    where t.app_key = 'my_lokr'
      and t.name = 'Free'
    limit 1
  ),
  now()
from (
  select user_id from public.lokr_workspace_members
  union
  select user_id from public.lokr_passwords
) people
left join public.profiles p on p.id = people.user_id
on conflict (user_id, app_key) do nothing;
