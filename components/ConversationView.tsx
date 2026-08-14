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
  "id, conversation_id, sender_id, body, created_at, updated_at, sender:profiles!lokr_messages_sender_id_fkey(id, email, full_name, avatar_url, created_at, updated_at), lokr_message_attachments(*)";

export function ConversationView({
  conversationId,
  workspaceId,
  usedBytes,
  limitBytes,
  subject,
  members,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  workspaceId: string;
  usedBytes: number;
  limitBytes: number;
  subject: string | null;
  members: InboxMember[];
  currentUserId: string;
  initialMessages: MessageWithDetails[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const router = useRouter();
  const title = conversationTitle(members, currentUserId, subject);

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
        <form
          action={async () => {
            await leaveConversation(conversationId);
          }}
        >
          <Button type="submit" variant="outline">
            Leave conversation
          </Button>
        </form>
      </header>
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
