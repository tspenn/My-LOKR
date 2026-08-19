import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KIND_ENV: Record<string, string> = {
  business: 'STRIPE_PRICE_LOKR_BUSINESS',
  vault50: 'STRIPE_PRICE_LOKR_VAULT_50',
  vault100: 'STRIPE_PRICE_LOKR_VAULT_100',
  vault250: 'STRIPE_PRICE_LOKR_VAULT_250',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Sign in to subscribe' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { kind, workspace_id: requestedWorkspaceId } = (await req.json()) as {
      kind?: string
      workspace_id?: string
    }
    const envName = kind ? KIND_ENV[kind] : undefined
    const priceId = envName ? Deno.env.get(envName) : undefined
    if (!kind || !priceId) {
      return new Response(JSON.stringify({ error: 'That plan is not configured yet.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY_MYLOKR') || Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe is not configured yet' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    let membershipQuery = admin
      .from('lokr_workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
    if (requestedWorkspaceId) {
      membershipQuery = membershipQuery.eq('workspace_id', requestedWorkspaceId)
    }
    const { data: membership } = await membershipQuery.maybeSingle()
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Set up your LOKR first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: workspace } = await admin
      .from('lokr_workspaces')
      .select('stripe_customer_id, created_by')
      .eq('id', membership.workspace_id)
      .single()

    if (!workspace || workspace.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the owner can pay for this group. Invitees stay free.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const quantity = 1
    const appUrl = (
      Deno.env.get('MYLOKR_APP_URL') ||
      Deno.env.get('NEXT_PUBLIC_SITE_URL') ||
      'https://www.my-lokr.com'
    ).replace(/\/$/, '')
    const stripe = new Stripe(stripeKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      client_reference_id: user.id,
      customer: workspace?.stripe_customer_id || undefined,
      customer_email: workspace?.stripe_customer_id ? undefined : (user.email ?? undefined),
      metadata: {
        app: 'my_lokr',
        kind,
        user_id: user.id,
        workspace_id: membership.workspace_id,
      },
      subscription_data: {
        metadata: {
          app: 'my_lokr',
          kind,
          user_id: user.id,
          workspace_id: membership.workspace_id,
        },
      },
    })

    if (!session.url) {
      return new Response(JSON.stringify({ error: 'Could not create checkout session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout-mylokr error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
