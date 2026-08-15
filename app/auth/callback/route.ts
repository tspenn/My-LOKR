import { NextResponse } from "next/server";
import { acceptInviteAfterAuth } from "@/lib/actions/invites";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/lockrs";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc("lokr_activate_pending_password");
      const { data: hasPassword } = await supabase.rpc("lokr_has_password");
      const accepted = await acceptInviteAfterAuth();
      if (accepted.workspaceId) {
        const dest = hasPassword ? "/inbox" : "/update-password";
        return NextResponse.redirect(`${origin}${dest}`);
      }
      if (!hasPassword) {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
