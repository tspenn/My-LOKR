import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.7.0'

function admin() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

function vaultFromKind(kind: string | undefined) {
  if (kind === 'vault50') return '50'
  if (kind === 'vault100') return '100'
  if (kind === 'vault250') return '250'
  return null
}

function lokrPlanName(kind: string, vault: string | null) {
  if (kind === 'business') return 'LOKR Business'
  if (vault) return `LOKR Vault ${vault} GB`
  return 'LOKR Free'
}

const FREE_EXPIRES = '2099-01-01T00:00:00.000Z'

async function profileEmail(userId: string) {
  const { data } = await admin().from('profiles').select('email').eq('id', userId).maybeSingle()
  return (data?.email as string | null) ?? null
}

async function refreshUserSubscription(userId: string) {
  const db = admin()
  const { data: spaces } = await db
    .from('lokr_workspaces')
    .select('plan, vault_addon, stripe_customer_id, stripe_subscription_id, vault_subscription_id')
    .eq('created_by', userId)

  const business = spaces?.find((space) => space.plan === 'business')
  const vaultSpace = spaces?.find((space) => space.vault_addon && space.vault_addon !== 'none')
  const email = await profileEmail(userId)

  if (business) {
    await db.from('user_subscriptions').upsert(
      {
        user_id: userId,
        app_key: 'my_lokr',
        plan_name: 'LOKR Business',
        status: 'active',
        user_email: email,
        billing_cycle: 'monthly',
        stripe_customer_id: business.stripe_customer_id,
        stripe_subscription_id: business.stripe_subscription_id,
        expires_at: FREE_EXPIRES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,app_key' },
    )
    return
  }

  if (vaultSpace) {
    await db.from('user_subscriptions').upsert(
      {
        user_id: userId,
        app_key: 'my_lokr',
        plan_name: `LOKR Vault ${vaultSpace.vault_addon} GB`,
        status: 'active',
        user_email: email,
        billing_cycle: 'monthly',
        stripe_customer_id: vaultSpace.stripe_customer_id,
        stripe_subscription_id: vaultSpace.vault_subscription_id,
        expires_at: FREE_EXPIRES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,app_key' },
    )
    return
  }

  await db.from('user_subscriptions').upsert(
    {
      user_id: userId,
      app_key: 'my_lokr',
      plan_name: 'LOKR Free',
      status: 'free',
      user_email: email,
      billing_cycle: 'none',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      expires_at: FREE_EXPIRES,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,app_key' },
  )
}

async function applyCheckout(
  workspaceId: string,
  userId: string,
  kind: string,
  sub: Stripe.Subscription,
  customerId: string | null,
) {
  const db = admin()
  const customer =
    customerId ?? (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null)
  const vault = vaultFromKind(kind)
  const patch: Record<string, unknown> = {
    stripe_customer_id: customer,
    updated_at: new Date().toISOString(),
  }

  if (kind === 'business') {
    patch.plan = 'business'
    patch.stripe_subscription_id = sub.id
  } else if (vault) {
    patch.vault_addon = vault
    patch.vault_subscription_id = sub.id
  }

  const { error } = await db.from('lokr_workspaces').update(patch).eq('id', workspaceId)
  if (error) throw error

  const periodEnd = sub.items.data[0]?.current_period_end ?? (sub as { current_period_end?: number }).current_period_end
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null
  await db.from('user_subscriptions').upsert(
    {
      user_id: userId,
      app_key: 'my_lokr',
      plan_name: lokrPlanName(kind, vault),
      status: sub.status,
      user_email: await profileEmail(userId),
      stripe_customer_id: customer,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items.data[0]?.price?.id ?? null,
      billing_cycle: 'monthly',
      current_period_end: periodEndIso,
      expires_at: periodEndIso ?? FREE_EXPIRES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,app_key' },
  )
}

async function applySubscriptionChange(sub: Stripe.Subscription) {
  const db = admin()
  const ended = sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired'

  if (ended) {
    const { data: byPlan } = await db
      .from('lokr_workspaces')
      .select('id, created_by')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()
    if (byPlan?.id) {
      await db
        .from('lokr_workspaces')
        .update({ plan: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('id', byPlan.id)
      if (byPlan.created_by) await refreshUserSubscription(byPlan.created_by)
      return
    }
    const { data: byVault } = await db
      .from('lokr_workspaces')
      .select('id, created_by')
      .eq('vault_subscription_id', sub.id)
      .maybeSingle()
    if (byVault?.id) {
      await db
        .from('lokr_workspaces')
        .update({ vault_addon: 'none', vault_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('id', byVault.id)
      if (byVault.created_by) await refreshUserSubscription(byVault.created_by)
    }
    return
  }

  const workspaceId = sub.metadata?.workspace_id
  const kind = sub.metadata?.kind
  const userId = sub.metadata?.user_id
  if (workspaceId && kind && userId) {
    await applyCheckout(workspaceId, userId, kind, sub, null)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY_MYLOKR') || Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_MYLOKR') || Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripeKey || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY_MYLOKR or STRIPE_WEBHOOK_SECRET_MYLOKR')
    return new Response('Webhook not configured', { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.app !== 'my_lokr') break
        const userId = session.client_reference_id ?? session.metadata?.user_id
        const workspaceId = session.metadata?.workspace_id
        const kind = session.metadata?.kind
        const subscriptionId = session.subscription
        if (!userId || !workspaceId || !kind || typeof subscriptionId !== 'string') break
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        await applyCheckout(
          workspaceId,
          userId,
          kind,
          sub,
          typeof session.customer === 'string' ? session.customer : null,
        )
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.metadata?.app && sub.metadata.app !== 'my_lokr') break
        await applySubscriptionChange(sub)
        break
      }
      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('stripe-webhook-mylokr handler error:', err)
    return new Response('Webhook handler failed', { status: 500 })
  }
})
