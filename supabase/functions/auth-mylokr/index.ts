import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_LOGIN = "That email or password did not work. Please try again.";
const GENERIC_RESET = "If that account exists, a reset link is on its way to your email.";
const GENERIC_SIGNUP =
  "Check your email for a confirmation link. Once you confirm, you will open your free Lokr.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeRedirect(raw: unknown) {
  const fallback = "https://www.my-lokr.com/auth/callback";
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const ok =
      host === "www.my-lokr.com" ||
      host === "my-lokr.com" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      (host.endsWith(".vercel.app") && host.includes("my-lokr"));
    const protoOk = url.protocol === "https:" || host === "localhost" || host === "127.0.0.1";
    if (!ok || !protoOk) return fallback;
    if (url.pathname !== "/auth/callback") {
      return `${url.origin}/auth/callback${url.search}`;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function issueSession(
  admin: ReturnType<typeof adminClient>,
  email: string,
) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return null;
  const verified = await admin.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  const session = verified.data.session;
  if (verified.error || !session?.access_token || !session.refresh_token) {
    return null;
  }
  return session;
}

const SIGNUP_APP = "my_lokr";

async function sendMagicLink(
  admin: ReturnType<typeof adminClient>,
  email: string,
  redirectTo: string,
  createUser: boolean,
  fullName?: string,
) {
  const data: Record<string, string> = {};
  if (createUser) data.signup_app = SIGNUP_APP;
  if (fullName) {
    data.full_name = fullName;
    data.display_name = fullName;
  }
  return admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: createUser,
      emailRedirectTo: redirectTo,
      data: Object.keys(data).length ? data : undefined,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as {
      action?: string;
      email?: string;
      password?: string;
      full_name?: string;
      redirect_to?: string;
    };
    const action = body.action;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const redirectTo = safeRedirect(body.redirect_to);
    const admin = adminClient();

    if (action === "login") {
      if (!email || !password) return json({ error: GENERIC_LOGIN }, 400);
      const { data: userId, error } = await admin.rpc("lokr_verify_password", {
        p_email: email,
        p_password: password,
      });
      if (error || typeof userId !== "string") {
        return json({ error: GENERIC_LOGIN }, 401);
      }
      const session = await issueSession(admin, email);
      if (!session) return json({ error: GENERIC_LOGIN }, 401);
      return json({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    if (action === "signup" || action === "join") {
      if (!email || !fullName || !password) {
        return json({ error: "Please fill in your name, email, and password." }, 400);
      }
      const { error: stageError } = await admin.rpc("lokr_stage_password", {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
      });
      if (stageError) {
        console.error("lokr_stage_password", stageError);
        const message = stageError.message ?? "";
        if (message.includes("already has a My Lokr password")) {
          return json({ error: "That email already has an account — sign in." }, 400);
        }
        if (message.includes("at least 12")) {
          return json({
            error: "Please choose a LOKR password with at least 12 characters.",
          }, 400);
        }
        if (message.includes("valid email")) {
          return json({ error: "Enter a valid email." }, 400);
        }
        return json({ error: "We could not create that account. Please try again." }, 400);
      }
      const { error: sendError } = await sendMagicLink(
        admin,
        email,
        redirectTo,
        true,
        fullName,
      );
      if (sendError) {
        return json({ error: "We could not send a confirmation email. Please try again." }, 400);
      }
      return json({
        ok: true,
        message: action === "join"
          ? "Check your email for a confirmation link. After you confirm, you will land in this Lokr — only because this phone was verified."
          : GENERIC_SIGNUP,
      });
    }

    if (action === "reset") {
      if (!email) return json({ error: "Please enter your email address." }, 400);
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (profile?.id) {
        await sendMagicLink(admin, email, redirectTo, false);
      }
      return json({ ok: true, message: GENERIC_RESET });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("auth-mylokr error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
