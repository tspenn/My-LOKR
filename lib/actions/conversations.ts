"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function createConversation(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const selectedIds = [
    ...new Set(formData.getAll("member_ids").map((value) => String(value).trim()).filter(Boolean)),
  ];

  if (selectedIds.length === 0) {
    return { error: "Please choose at least one person to write to.", conversationId: null };
  }

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) {
    return { error: "Choose a LOKR first.", conversationId: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again.", conversationId: null };
  }

  if (selectedIds.length === 1) {
    const { data: directId, error: directError } = await supabase.rpc(
      "lokr_ensure_direct_conversation",
      {
        p_other_user_id: selectedIds[0],
        p_workspace_id: workspace.id,
      },
    );
    if (directError || !directId) {
      const raw = directError?.message ?? "";
      if (
        raw.includes("You can only write to people in this Lokr") ||
        raw.includes("not in this LOKR")
      ) {
        return {
          error: "That person is not in this LOKR. Invite them from this conversation.",
          conversationId: null,
        };
      }
      return { error: raw || "We could not open that conversation.", conversationId: null };
    }
    revalidatePath("/inbox");
    revalidatePath(`/conversation/${directId}`);
    return { error: null, conversationId: directId as string };
  }

  const { data, error } = await supabase.rpc("lokr_create_conversation", {
    p_subject: subject || null,
    p_member_ids: selectedIds,
    p_workspace_id: workspace.id,
  });

  if (error || !data) {
    const raw = error?.message ?? "";
    if (
      raw.includes("You can only write to people in this Lokr") ||
      raw.includes("not in this LOKR")
    ) {
      return {
        error: "That person is not in this LOKR. Invite them from Settings first.",
        conversationId: null,
      };
    }
    return { error: raw || "We could not start that conversation.", conversationId: null };
  }

  const firstMessage = String(formData.get("body") ?? "").trim();
  if (firstMessage) {
    const { error: messageError } = await supabase.from("lokr_messages").insert({
      conversation_id: data,
      sender_id: user.id,
      body: firstMessage,
    });
    if (messageError) {
      return {
        error: "The conversation opened, but the first message did not send. Open Inbox and try again.",
        conversationId: data as string,
      };
    }
  }

  revalidatePath("/inbox");
  revalidatePath(`/conversation/${data}`);
  return { error: null, conversationId: data as string };
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
