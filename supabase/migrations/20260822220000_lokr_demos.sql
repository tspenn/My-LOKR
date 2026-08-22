-- Public tour showcase. Not a locker, not a seat, not a real thread.
-- Anon may only execute lokr_get_demo. No client SELECT on this table.

create table if not exists public.lokr_demos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  title text not null,
  payload jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  opened_count integer not null default 0,
  constraint lokr_demos_payload_size check (octet_length(payload::text) <= 65536)
);

alter table public.lokr_demos enable row level security;
alter table public.lokr_demos force row level security;

revoke all on table public.lokr_demos from public, anon, authenticated;

create or replace function private.lokr_demos_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  raw text;
  stripped text;
begin
  if octet_length(new.payload::text) > 65536 then
    raise exception 'Demo payload is too large';
  end if;
  raw := new.payload::text;
  if raw ~ '\+[1-9][0-9]{7,14}' then
    raise exception 'Demo payload cannot include a phone number';
  end if;
  stripped := regexp_replace(
    raw,
    '[A-Za-Z0-9._%+-]+@example\.invalid',
    '',
    'gi'
  );
  if stripped ~* '[A-Za-Z0-9._%+-]+@[A-Za-Z0-9.-]+\.[A-Za-Z]{2,}' then
    raise exception 'Demo payload cannot include a real email';
  end if;
  return new;
end;
$$;

drop trigger if exists lokr_demos_validate on public.lokr_demos;
create trigger lokr_demos_validate
  before insert or update on public.lokr_demos
  for each row
  execute function private.lokr_demos_validate();

create or replace function public.lokr_get_demo(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  demo public.lokr_demos;
begin
  if p_token is null or length(btrim(p_token)) = 0 then
    return null;
  end if;

  select * into demo
  from public.lokr_demos
  where token = btrim(p_token)
    and expires_at > now();

  if not found then
    return null;
  end if;

  update public.lokr_demos
  set opened_count = opened_count + 1
  where id = demo.id;

  return jsonb_build_object(
    'title', demo.title,
    'payload', demo.payload
  );
end;
$$;

revoke all on function public.lokr_get_demo(text) from public;
grant execute on function public.lokr_get_demo(text) to anon, authenticated;

insert into public.lokr_demos (token, title, expires_at, payload)
values (
  '5dd2214fa8bb1058933d64a7e5e1426a',
  'A sample LOKR',
  timestamptz '2027-12-31 23:59:59+00',
  $json$
  {
    "visitorId": "11111111-1111-4111-8111-111111111111",
    "lockerName": "Sample locker",
    "inbox": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "subject": "Travel folder",
        "created_at": "2026-08-20T14:02:00.000Z",
        "updated_at": "2026-08-20T14:18:00.000Z",
        "last_message_body": "When you land, the notes stay in this locker.",
        "last_message_at": "2026-08-20T14:18:00.000Z",
        "unread_count": 1,
        "members": [
          { "id": "11111111-1111-4111-8111-111111111111", "display_name": "You", "email": "", "avatar_url": null },
          { "id": "22222222-2222-4222-8222-222222222222", "display_name": "Jordan Hale", "email": "", "avatar_url": null }
        ]
      },
      {
        "id": "55555555-5555-4555-8555-555555555555",
        "subject": "Draft notes",
        "created_at": "2026-08-19T16:10:00.000Z",
        "updated_at": "2026-08-20T11:40:00.000Z",
        "last_message_body": "I can add the outline tonight.",
        "last_message_at": "2026-08-20T11:40:00.000Z",
        "unread_count": 0,
        "members": [
          { "id": "11111111-1111-4111-8111-111111111111", "display_name": "You", "email": "", "avatar_url": null },
          { "id": "22222222-2222-4222-8222-222222222222", "display_name": "Jordan Hale", "email": "", "avatar_url": null },
          { "id": "33333333-3333-4333-8333-333333333333", "display_name": "Sam Okoye", "email": "", "avatar_url": null }
        ]
      }
    ],
    "threads": {
      "44444444-4444-4444-8444-444444444444": {
        "subject": "Travel folder",
        "members": [
          { "id": "11111111-1111-4111-8111-111111111111", "display_name": "You", "email": "", "avatar_url": null },
          { "id": "22222222-2222-4222-8222-222222222222", "display_name": "Jordan Hale", "email": "", "avatar_url": null }
        ],
        "messages": [
          {
            "id": "m-travel-1",
            "sender_id": "22222222-2222-4222-8222-222222222222",
            "sender_name": "Jordan Hale",
            "body": "I put the itinerary and the insurance PDF in this locker so they are not sitting in email.",
            "created_at": "2026-08-20T14:02:00.000Z"
          },
          {
            "id": "m-travel-2",
            "sender_id": "11111111-1111-4111-8111-111111111111",
            "sender_name": "You",
            "body": "Got them. I will keep the copies here.",
            "created_at": "2026-08-20T14:11:00.000Z"
          },
          {
            "id": "m-travel-3",
            "sender_id": "22222222-2222-4222-8222-222222222222",
            "sender_name": "Jordan Hale",
            "body": "When you land, the notes stay in this locker.",
            "created_at": "2026-08-20T14:18:00.000Z"
          }
        ]
      },
      "55555555-5555-4555-8555-555555555555": {
        "subject": "Draft notes",
        "members": [
          { "id": "11111111-1111-4111-8111-111111111111", "display_name": "You", "email": "", "avatar_url": null },
          { "id": "22222222-2222-4222-8222-222222222222", "display_name": "Jordan Hale", "email": "", "avatar_url": null },
          { "id": "33333333-3333-4333-8333-333333333333", "display_name": "Sam Okoye", "email": "", "avatar_url": null }
        ],
        "messages": [
          {
            "id": "m-draft-1",
            "sender_id": "33333333-3333-4333-8333-333333333333",
            "sender_name": "Sam Okoye",
            "body": "This is the kind of draft we would not put in Gmail.",
            "created_at": "2026-08-19T16:10:00.000Z"
          },
          {
            "id": "m-draft-2",
            "sender_id": "22222222-2222-4222-8222-222222222222",
            "sender_name": "Jordan Hale",
            "body": "Agreed. Invite-only, then we talk here.",
            "created_at": "2026-08-19T16:22:00.000Z"
          },
          {
            "id": "m-draft-3",
            "sender_id": "11111111-1111-4111-8111-111111111111",
            "sender_name": "You",
            "body": "I can add the outline tonight.",
            "created_at": "2026-08-20T11:40:00.000Z"
          }
        ]
      }
    }
  }
  $json$::jsonb
)
on conflict (token) do update
set title = excluded.title,
    payload = excluded.payload,
    expires_at = excluded.expires_at;
