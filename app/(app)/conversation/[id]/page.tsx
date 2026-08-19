import { notFound, redirect } from "next/navigation";
import { ConversationView } from "@/components/ConversationView";
import { InboxShell } from "@/components/InboxShell";
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
    .select("user_id, profiles!lokr_conversation_members_user_id_fkey(id, email, full_name, avatar_url)")
    .eq("conversation_id", id);

  const members: InboxMember[] = (memberRows ?? []).flatMap((row) => {
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

  const { data: messages } = await supabase
    .from("lokr_messages")
    .select(
      "id, conversation_id, sender_id, body, created_at, updated_at, sender:profiles!lokr_messages_sender_id_fkey(id, email, full_name, avatar_url), lokr_message_attachments(*)",
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  await markConversationRead(id);

  const { data: inviteRows } = await supabase
    .from("lokr_phone_invites")
    .select("id, phone_e164, phone_last4, status, otp_display, token, created_at")
    .eq("workspace_id", workspace.id)
    .in("status", ["pending", "awaiting_code", "confirmed", "accepted"])
    .order("created_at", { ascending: false });
  const pendingInvites = (inviteRows ?? []) as PendingPhoneInvite[];

  const initialMessages: MessageWithDetails[] = (messages ?? []).map((row) => {
    const sender = row.sender as unknown as ProfileRow | ProfileRow[] | null;
    const senderRow = Array.isArray(sender) ? sender[0] : sender;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: senderRow ? profileFromRow(senderRow) : null,
      message_attachments: (row.lokr_message_attachments ?? []) as unknown as MessageAttachment[],
    };
  });

  return (
    <InboxShell currentUserId={userId}>
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
    </InboxShell>
  );
}
