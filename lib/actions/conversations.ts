"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function createConversation(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const memberIds = formData.getAll("member_ids").map(String).filter(Boolean);

  if (memberIds.length === 0) {
    return { error: "Please choose at least one person to write to." };
  }

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) {
    return { error: "Choose a Lokr first." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_create_conversation", {
    p_subject: subject || null,
    p_member_ids: memberIds,
    p_workspace_id: workspace.id,
  });

  if (error || !data) {
    return { error: error?.message ?? "We could not start that conversation." };
  }

  const firstMessage = String(formData.get("body") ?? "").trim();
  if (firstMessage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("lokr_messages").insert({
        conversation_id: data,
        sender_id: user.id,
        body: firstMessage,
      });
    }
  }

  revalidatePath("/inbox");
  redirect(`/conversation/${data}`);
}

export async function leaveConversation(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  const { error } = await supabase
    .from("lokr_conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "We could not remove you from this conversation." };
  }

  revalidatePath("/inbox");
  redirect("/inbox");
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("lokr_conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  revalidatePath("/inbox");
}

export async function getInbox() {
  const { workspace } = await getCurrentWorkspace();
  if (!workspace) {
    return { items: [], error: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_get_inbox", {
    p_workspace_id: workspace.id,
  });
  if (error) {
    return { items: [], error: error.message };
  }
  return { items: data ?? [], error: null };
}
