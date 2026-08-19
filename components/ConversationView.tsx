"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageThread } from "@/components/MessageThread";
import { MessageComposer } from "@/components/MessageComposer";
import { leaveConversation } from "@/lib/actions/conversations";
import { conversationTitle } from "@/lib/utils";
import { profileFromRow, type ProfileRow } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { useCall } from "@/components/CallProvider";
import { Alert } from "@/components/ui/alert";
import { PhoneInviteForm, type PendingPhoneInvite } from "@/components/PhoneInviteForm";
import { UserPlus, Video } from "lucide-react";
import type { InboxMember, MessageAttachment, MessageWithDetails } from "@/types/database";

type RawMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  sender: ProfileRow | ProfileRow[] | null;
  lokr_message_attachments: MessageAttachment[] | null;
};

function mapMessages(rows: RawMessage[]): MessageWithDetails[] {
  return rows.map((row) => {
    const senderRow = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: senderRow ? profileFromRow(senderRow) : null,
      message_attachments: row.lokr_message_attachments ?? [],
    };
  });
}

const MESSAGE_SELECT =
  "id, conversation_id, sender_id, body, created_at, updated_at, sender:profiles!lokr_messages_sender_id_fkey(id, email, full_name, avatar_url), lokr_message_attachments(*)";

export function ConversationView({
  conversationId,
  workspaceId,
  usedBytes,
  limitBytes,
  subject,
  members,
  currentUserId,
  initialMessages,
  pendingInvites,
}: {
  conversationId: string;
  workspaceId: string;
  usedBytes: number;
  limitBytes: number;
  subject: string | null;
  members: InboxMember[];
  currentUserId: string;
  initialMessages: MessageWithDetails[];
  pendingInvites: PendingPhoneInvite[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [callError, setCallError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();
  const title = conversationTitle(members, currentUserId, subject);
  const { startVideoCall, inCall } = useCall();
  const directPeer = members.filter((member) => member.id !== currentUserId);
  const canCall = members.length === 2 && directPeer.length === 1;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const supabase = createClient();

    async function loadMessages() {
      const { data } = await supabase
        .from("lokr_messages")
        .select(MESSAGE_SELECT)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(mapMessages(data as unknown as RawMessage[]));
      }
    }

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lokr_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void loadMessages();
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lokr_message_attachments",
        },
        () => {
          void loadMessages();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">
            {members.map((member) => member.display_name).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setInviteOpen((open) => !open)}
          >
            <UserPlus />
            Invite
          </Button>
          {canCall ? (
            <Button
              type="button"
              variant="outline"
              disabled={inCall}
              onClick={async () => {
                setCallError(null);
                const error = await startVideoCall(conversationId, directPeer[0].display_name);
                if (error) setCallError(error);
              }}
            >
              <Video />
              Video call
            </Button>
          ) : null}
          <form
            action={async () => {
              await leaveConversation(conversationId);
            }}
          >
            <Button type="submit" variant="outline">
              Leave conversation
            </Button>
          </form>
        </div>
      </header>
      {inviteOpen ? (
        <div className="border-b border-border bg-card px-4 py-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Invite someone new into this LOKR. After they join, they can be added
            to conversations from New conversation.
          </p>
          <PhoneInviteForm pending={pendingInvites} />
        </div>
      ) : null}
      {callError ? (
        <Alert variant="destructive" className="mx-4 mt-3">
          {callError}
        </Alert>
      ) : null}
      <MessageThread messages={messages} currentUserId={currentUserId} />
      <MessageComposer
        conversationId={conversationId}
        workspaceId={workspaceId}
        usedBytes={usedBytes}
        limitBytes={limitBytes}
      />
    </section>
  );
}
