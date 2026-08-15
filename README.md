# My Lokr

Private messaging for the people and information you actually care about.

My Lokr is a private communication tool for families, small teams, and businesses. It is **not** a replacement for normal email. It is a locked, controlled space for files and ideas you would not put in Gmail or Outlook — including proprietary work and patent drafts.

Messages live in a private **Supabase Postgres** database with **Row Level Security** on every table. Files sit in **private Storage** buckets with short-lived signed download links. They are not routed through Google, Microsoft, or consumer email. Stripe is used only if you pay, and only for billing — never for message or file content. There are no ads on any plan.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Friday Canvas: Supabase Auth, Postgres, Storage, Realtime
- Stripe Checkout via Edge Functions `create-checkout-mylokr` and `stripe-webhook-mylokr`
- Deploy to Vercel

## 1. Friday Canvas

Do **not** create a new Supabase project. Use Friday Canvas:

- Project URL: `https://psbdjnqcjpxapypcfigx.supabase.co`
- App key: `my_lokr`

Tables: `lokr_workspaces`, `lokr_workspace_members`, `lokr_conversations`, `lokr_conversation_members`, `lokr_messages`, `lokr_message_attachments`. Profiles reuse `public.profiles` (`full_name`, `email`, `avatar_url`).

Private buckets: `lokr-attachments` (20 MB files) and `lokr-logos` (2 MB).

Auth redirect URLs must include `http://localhost:3000/auth/callback`, `https://www.my-lokr.com/auth/callback`, and `https://my-lokr.com/auth/callback`.

Do not run `supabase/migrations/20260814120000_init.sql` against Friday Canvas. That file is the unused standalone schema.

## 2. Environment

Copy `.env.example` to `.env.local` and set the Friday Canvas publishable (or anon) key.

```
NEXT_PUBLIC_SUPABASE_URL=https://psbdjnqcjpxapypcfigx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ENTERPRISE_EMAIL=hello@go-i-agency.com
```

Never put the service role key in this app or in any `NEXT_PUBLIC_` variable.

Stripe price IDs and secrets belong on the Edge Functions:

- `STRIPE_SECRET_KEY_MYLOKR` (falls back to `STRIPE_SECRET_KEY`)
- `STRIPE_WEBHOOK_SECRET_MYLOKR`
- `MYLOKR_APP_URL`
- `STRIPE_PRICE_LOKR_BUSINESS`
- `STRIPE_PRICE_LOKR_VAULT_50` / `_100` / `_250`

## 3. Run locally

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). After sign-in you set up a Private or Business Lokr and load a logo. That logo sits front and center; **LOKR** stays small at the bottom of the inbox.

## 4. Plans

| Plan | Price | People | Storage |
| --- | --- | --- | --- |
| Free | $0 | 4 | 1 GB |
| Business | $19 / user / month | 15 | 50 GB shared |
| Enterprise | Custom | Negotiated | Negotiated |

**The Vault** (any plan): +50 GB $7, +100 GB $12, +250 GB $25. Usage meters warn at 80% and 95%. Uploads stop at 100%.

## 5. Deploy to Vercel

1. Push `https://github.com/tspenn/My-LOKR.git`.
2. Import the repo in Vercel (or `vercel link` then `vercel --prod`).
3. Set the same public env vars, with `NEXT_PUBLIC_SITE_URL=https://www.my-lokr.com` in production.
4. Update Supabase Site URL to `https://www.my-lokr.com` and add Redirect URLs for localhost, `https://www.my-lokr.com/**`, and `https://my-lokr.com/**`.
5. Point `MYLOKR_APP_URL` on the Edge Function secrets to `https://www.my-lokr.com`.

## Security notes

- RLS on every `lokr_` table. Conversations are workspace-scoped.
- Attachment downloads use 90-second signed URLs.
- Membership helpers live in the `private` schema.
- This is not internet email. There is no delivery outside My Lokr.
