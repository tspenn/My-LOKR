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
    return { error: "Choose a Lokr first.", conversationId: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again.", conversationId: null };
  }

  const selectedEmails = [
    ...new Set(
      formData
        .getAll("member_emails")
        .map((value) => String(value).trim().toLowerCase())
        .filter((value) => value.includes("@")),
    ),
  ];

  const { data: memberRows } = await supabase
    .from("lokr_workspace_members")
    .select("user_id, profiles!lokr_workspace_members_user_id_fkey(email)")
    .eq("workspace_id", workspace.id);

  const others = (memberRows ?? []).flatMap((row) => {
    if (!row.user_id || String(row.user_id).toLowerCase() === user.id.toLowerCase()) return [];
    const profile = row.profiles as { email?: string | null } | { email?: string | null }[] | null;
    const item = Array.isArray(profile) ? profile[0] : profile;
    return [
      {
        id: String(row.user_id).toLowerCase(),
        email: (item?.email ?? "").trim().toLowerCase(),
      },
    ];
  });

  const selected = new Set(selectedIds.map((id) => id.toLowerCase()));
  let recipients = others.filter((person) => selected.has(person.id)).map((person) => person.id);
  if (recipients.length === 0 && selectedEmails.length > 0) {
    recipients = others
      .filter((person) => person.email && selectedEmails.includes(person.email))
      .map((person) => person.id);
  }
  if (recipients.length === 0 && others.length === 1) {
    recipients = [others[0].id];
  }
  if (recipients.length === 0) {
    return {
      error: "That person is not in this Lokr. Invite them from Settings first.",
      conversationId: null,
    };
  }

  const { data, error } = await supabase.rpc("lokr_create_conversation", {
    p_subject: subject || null,
    p_member_ids: recipients,
    p_workspace_id: workspace.id,
  });

  if (error || !data) {
    const raw = error?.message ?? "";
    if (raw.includes("You can only write to people in this Lokr")) {
      return {
        error: "That person is not in this Lokr. Invite them from Settings first.",
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
