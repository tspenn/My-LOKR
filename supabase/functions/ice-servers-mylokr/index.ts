import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STUN: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

type RTCIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in first" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error,
    } = await caller.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const iceServers: RTCIceServer[] = [...STUN];
    const turnUrls = Deno.env.get("LOKR_TURN_URLS");
    const turnUser = Deno.env.get("LOKR_TURN_USERNAME");
    const turnCredential = Deno.env.get("LOKR_TURN_CREDENTIAL");
    if (turnUrls && turnUser && turnCredential) {
      iceServers.push({
        urls: turnUrls.split(",").map((value) => value.trim()).filter(Boolean),
        username: turnUser,
        credential: turnCredential,
      });
    }

    const cfKeyId = Deno.env.get("LOKR_CF_TURN_KEY_ID");
    const cfToken = Deno.env.get("LOKR_CF_TURN_API_TOKEN");
    if (cfKeyId && cfToken) {
      const extra = await fetchCloudflareTurn(cfKeyId, cfToken);
      if (extra) iceServers.push(...extra);
    }

    const meteredUrl = Deno.env.get("LOKR_METERED_TURN_URL");
    if (meteredUrl) {
      const res = await fetch(meteredUrl);
      if (res.ok) {
        const body = (await res.json()) as RTCIceServer[] | { iceServers?: RTCIceServer[] };
        const extra = Array.isArray(body) ? body : body.iceServers;
        if (Array.isArray(extra)) iceServers.push(...extra);
      }
    }

    return new Response(JSON.stringify({ iceServers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ice-servers-mylokr error:", err);
    return new Response(JSON.stringify({ iceServers: STUN }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Browsers block TURN on port 53; Cloudflare still lists it. */
function withoutPort53(servers: RTCIceServer[]): RTCIceServer[] {
  return servers
    .map((server) => {
      const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
        (url) => url && !url.includes(":53"),
      );
      if (urls.length === 0) return null;
      return { ...server, urls };
    })
    .filter((server): server is RTCIceServer => server !== null);
}

async function fetchCloudflareTurn(
  keyId: string,
  token: string,
): Promise<RTCIceServer[] | null> {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 21600 }),
    },
  );
  if (!res.ok) {
    console.error("Cloudflare TURN credentials failed:", res.status, await res.text());
    return null;
  }
  const body = (await res.json()) as {
    iceServers?: RTCIceServer | RTCIceServer[];
  };
  const raw = body.iceServers;
  if (!raw) return null;
  const extra = Array.isArray(raw) ? raw : [raw];
  if (extra.length === 0 || !extra[0]?.urls) return null;
  return withoutPort53(extra);
}
