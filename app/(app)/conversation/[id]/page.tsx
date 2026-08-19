import { notFound, redirect } from "next/navigation";
import { ConversationView } from "@/components/ConversationView";
import { markConversationRead } from "@/lib/actions/conversations";
import { displayNameFrom, profileFromRow, type ProfileRow } from "@/lib/profile";
import type { PendingPhoneInvite } from "@/components/PhoneInviteForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, workspaceUsage } from "@/lib/workspace";
import type { InboxMember, MessageAttachment, MessageWithDetails } from "@/types/database";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) redirect("/lockrs");
  const usage = workspaceUsage(workspace);

  const { data: conversation } = await supabase
    .from("lokr_conversations")
    .select("id, subject, created_at, updated_at, created_by, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation || conversation.workspace_id !== workspace.id) notFound();

  const { data: memberRows } = await supabase
    .from("lokr_conversation_members")
    .select("user_id")
    .eq("conversation_id", id);

  const memberIds = [...new Set((memberRows ?? []).map((row) => row.user_id).filter(Boolean))];
  const { data: profileRows } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", memberIds)
    : { data: [] as ProfileRow[] };

  const profileById = new Map(
    (profileRows ?? []).map((row) => [row.id, row as ProfileRow]),
  );

  const members: InboxMember[] = memberIds.map((memberId) => {
    const profile = profileById.get(memberId);
    return {
      id: memberId,
      display_name: profile ? displayNameFrom(profile) : "Someone",
      email: profile?.email ?? "",
      avatar_url: profile?.avatar_url ?? null,
    };
  });

  const { data: messageRows } = await supabase
    .from("lokr_messages")
    .select("id, conversation_id, sender_id, body, created_at, updated_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const messages = messageRows ?? [];
  const messageIds = messages.map((row) => row.id);
  const { data: attachmentRows } = messageIds.length
    ? await supabase.from("lokr_message_attachments").select("*").in("message_id", messageIds)
    : { data: [] as MessageAttachment[] };

  const attachmentsByMessage = new Map<string, MessageAttachment[]>();
  for (const attachment of attachmentRows ?? []) {
    const list = attachmentsByMessage.get(attachment.message_id) ?? [];
    list.push(attachment as MessageAttachment);
    attachmentsByMessage.set(attachment.message_id, list);
  }

  await markConversationRead(id);

  const { data: inviteRows } = await supabase
    .from("lokr_phone_invites")
    .select("id, phone_e164, phone_last4, status, otp_display, token, created_at")
    .eq("workspace_id", workspace.id)
    .in("status", ["pending", "awaiting_code", "confirmed", "accepted"])
    .order("created_at", { ascending: false });
  const pendingInvites = (inviteRows ?? []) as PendingPhoneInvite[];

  const initialMessages: MessageWithDetails[] = messages.map((row) => {
    const senderRow = profileById.get(row.sender_id) ?? null;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: senderRow ? profileFromRow(senderRow) : null,
      message_attachments: attachmentsByMessage.get(row.id) ?? [],
    };
  });

  return (
    <ConversationView
      conversationId={id}
      workspaceId={workspace.id}
      usedBytes={workspace.storage_used_bytes}
      limitBytes={usage.limit}
      subject={conversation.subject}
      members={members}
      currentUserId={userId}
      initialMessages={initialMessages}
      pendingInvites={pendingInvites}
    />
  );
}
