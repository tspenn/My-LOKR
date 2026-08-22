"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CallPeer, LokrCall } from "@/lib/call-signaling";
import type { InboxMember } from "@/types/database";
import { displayNameFrom, type ProfileRow } from "@/lib/profile";
import { planHasEncryptedCalls } from "@/lib/billing";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function startCall(conversationId: string) {
  const { workspace, demo } = await getCurrentWorkspace();
  if (!workspace || (!demo && !planHasEncryptedCalls(workspace.plan))) {
    return {
      error: "Live video in this locker is on Business. People you invite join on Free. Only the owner pays.",
      call: null,
    };
  }

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

export async function listCallPeers(conversationId: string) {
  const supabase = await createClient();
  const { data: memberRows } = await supabase
    .from("lokr_conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);
  const memberIds = [...new Set((memberRows ?? []).map((row) => row.user_id).filter(Boolean))];
  if (memberIds.length === 0) return { peers: [] as CallPeer[] };

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", memberIds);

  const profileById = new Map((profileRows ?? []).map((row) => [row.id, row as ProfileRow]));
  const peers: CallPeer[] = memberIds.map((id) => {
    const profile = profileById.get(id);
    return {
      id,
      display_name: profile ? displayNameFrom(profile) : "Someone",
    };
  });
  return { peers };
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
    return { error: "Choose a LOKR first.", conversationId: null };
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
    .select("user_id, profiles!lokr_workspace_members_user_id_fkey(id, email, full_name, avatar_url)")
    .eq("workspace_id", workspace.id)
    .neq("user_id", user.id);

  const people: InboxMember[] = (rows ?? []).flatMap((row) => {
    if (!row.user_id) return [];
    const profile = row.profiles as unknown as ProfileRow | ProfileRow[] | null;
    const item = Array.isArray(profile) ? profile[0] : profile;
    return [
      {
        id: row.user_id,
        display_name: item ? displayNameFrom(item) : "Someone",
        email: item?.email ?? "",
        avatar_url: item?.avatar_url ?? null,
      },
    ];
  });

  return { people, error: null };
}
