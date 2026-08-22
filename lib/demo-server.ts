import { createClient } from "@/lib/supabase/server";
import {
  OFFICIAL_DEMO_TOKEN,
  officialDemo,
  parseDemo,
  type Demo,
} from "@/lib/demo";

export async function getDemo(token: string): Promise<Demo | null> {
  const cleaned = token.trim();
  if (!cleaned) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("lokr_get_demo", {
      p_token: cleaned,
    });
    if (!error && data) {
      const parsed = parseDemo(data);
      if (parsed) return parsed;
    }
  } catch {
    // Env or RPC missing — official fixture still works.
  }

  if (cleaned === OFFICIAL_DEMO_TOKEN) return officialDemo();
  return null;
}
