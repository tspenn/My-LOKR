"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LokrCall } from "@/lib/call-signaling";
import type { InboxMember } from "@/types/database";
import { profileFromRow, type ProfileRow } from "@/lib/profile";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function startCall(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_start_call", {
    p_conversation_id: conversationId,
  });
  if (error || !data) {
    return { error: error?.message ?? "We could not start that call.", call: null };
  }

  const { data: call } = await supabase
    .from("lokr_calls")
    .select("id, conversation_id, caller_id, callee_id, status, created_at, ended_at")
    .eq("id", data)
    .single();

  if (!call) {
    return { error: "We could not start that call.", call: null };
  }

  return { error: null, call: call as LokrCall };
}

export async function loadCall(callId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lokr_calls")
    .select("id, conversation_id, caller_id, callee_id, status, created_at, ended_at")
    .eq("id", callId)
    .maybeSingle();
  if (error || !data) {
    return { error: "That call is not available.", call: null };
  }
  return { error: null, call: data as LokrCall };
}

export async function setCallStatus(callId: string, status: "active" | "ended") {
  const supabase = await createClient();
  if (status === "ended") {
    await supabase
      .from("lokr_calls")
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", callId);
    return;
  }
  await supabase.from("lokr_calls").update({ status }).eq("id", callId);
}

export async function ensureDirectConversation(otherUserId: string) {
  const { workspace } = await getCurrentWorkspace();
  if (!workspace) {
    return { error: "Choose a Lokr first.", conversationId: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_ensure_direct_conversation", {
    p_other_user_id: otherUserId,
    p_workspace_id: workspace.id,
  });
  if (error || !data) {
    return { error: error?.message ?? "We could not open that conversation.", conversationId: null };
  }
  revalidatePath("/inbox");
  return { error: null, conversationId: data as string };
}

export async function listWorkspacePeople() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { people: [] as InboxMember[], error: "Please sign in again." };

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { people: [] as InboxMember[], error: null };

  const { data: rows } = await supabase
    .from("lokr_workspace_members")
    .select("user_id, profiles(id, email, full_name, avatar_url)")
    .eq("workspace_id", workspace.id);

  const people: InboxMember[] = (rows ?? []).flatMap((row) => {
    const profile = row.profiles as unknown as ProfileRow | ProfileRow[] | null;
    if (!profile) return [];
    const item = Array.isArray(profile) ? profile[0] : profile;
    if (!item || item.id === user.id) return [];
    const mapped = profileFromRow(item);
    return [
      {
        id: mapped.id,
        display_name: mapped.display_name,
        email: mapped.email,
        avatar_url: mapped.avatar_url,
      },
    ];
  });

  return { people, error: null };
}
