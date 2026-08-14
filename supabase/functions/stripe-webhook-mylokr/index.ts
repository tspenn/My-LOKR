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
  await db.from('user_subscriptions').upsert(
    {
      user_id: userId,
      app_key: 'my_lokr',
      plan_name: kind === 'business' ? 'Business' : `The Vault ${vault} GB`,
      status: sub.status,
      stripe_customer_id: customer,
      stripe_subscription_id: sub.id,
      stripe_price_id: sub.items.data[0]?.price?.id ?? null,
      billing_cycle: 'monthly',
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
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
      .select('id')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()
    if (byPlan?.id) {
      await db
        .from('lokr_workspaces')
        .update({ plan: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('id', byPlan.id)
      return
    }
    const { data: byVault } = await db
      .from('lokr_workspaces')
      .select('id')
      .eq('vault_subscription_id', sub.id)
      .maybeSingle()
    if (byVault?.id) {
      await db
        .from('lokr_workspaces')
        .update({ vault_addon: 'none', vault_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('id', byVault.id)
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
