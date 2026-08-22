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
import { ConversationCall } from "@/components/ConversationCall";
import { CheckoutButton } from "@/components/CheckoutButton";
import { useCall } from "@/components/CallProvider";
import { Alert } from "@/components/ui/alert";
import { PhoneInviteForm, type PendingPhoneInvite } from "@/components/PhoneInviteForm";
import { ShareLink } from "@/components/ShareLink";
import { UserPlus, Video } from "lucide-react";
import { planHasEncryptedCalls, type PlanKey } from "@/lib/billing";
import { shareUrl } from "@/lib/sample-locker";
import type { LokrCall } from "@/lib/call-signaling";
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
  plan,
  sample = false,
  isOwner,
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
  plan: PlanKey;
  sample?: boolean;
  isOwner: boolean;
  subject: string | null;
  members: InboxMember[];
  currentUserId: string;
  initialMessages: MessageWithDetails[];
  pendingInvites: PendingPhoneInvite[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [callError, setCallError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [liveCall, setLiveCall] = useState<LokrCall | null>(null);
  const [showCallUpgrade, setShowCallUpgrade] = useState(false);
  const router = useRouter();
  const title = conversationTitle(members, currentUserId, subject);
  const call = useCall();
  const startVideoCall = call?.startVideoCall;
  const joinVideoCall = call?.joinVideoCall;
  const inThisCall = Boolean(call?.inCall && call.callConversationId === conversationId);
  const peers = members.map((member) => ({ id: member.id, display_name: member.display_name }));
  const canCall = members.length >= 2 && members.length <= 6;
  const paidCalls = sample || planHasEncryptedCalls(plan);

  async function requestVideoCall() {
    setCallError(null);
    if (!paidCalls) {
      setShowCallUpgrade(true);
      return;
    }
    if (!startVideoCall) return;
    const error = await startVideoCall(conversationId, peers);
    if (error) setCallError(error);
  }

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const supabase = createClient();
    async function loadLiveCall() {
      const { data } = await supabase
        .from("lokr_calls")
        .select("id, conversation_id, caller_id, callee_id, status, created_at, ended_at")
        .eq("conversation_id", conversationId)
        .in("status", ["ringing", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLiveCall((data as LokrCall | null) ?? null);
    }
    void loadLiveCall();
    const callsChannel = supabase
      .channel(`calls:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lokr_calls",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void loadLiveCall();
        },
      )
      .subscribe();

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
      void supabase.removeChannel(callsChannel);
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
            {sample ? "Share" : "Invite"}
          </Button>
          {canCall && liveCall && joinVideoCall && paidCalls && !inThisCall ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setCallError(null);
                const error = await joinVideoCall(liveCall, peers);
                if (error) setCallError(error);
              }}
            >
              <Video />
              Join call
            </Button>
          ) : null}
          {canCall && !inThisCall && !liveCall ? (
            <Button type="button" variant="outline" onClick={() => void requestVideoCall()}>
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
          {sample ? (
            <ShareLink url={shareUrl()} />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Invite someone new into this LOKR. After they join, they can be added
                to conversations from New conversation.
              </p>
              <PhoneInviteForm pending={pendingInvites} />
            </>
          )}
        </div>
      ) : null}
      {showCallUpgrade ? (
        <Alert className="mx-4 mt-3">
          <p className="font-medium text-foreground">Live video in this locker is on Business.</p>
          <p className="mt-1">
            {isOwner
              ? "Upgrade this locker and people you invite join the call on Free. The call is encrypted and not saved. Only you pay."
              : "Ask the owner to upgrade this locker. If you were invited into someone else’s Business locker, you can already take that call on Free."}
          </p>
          {isOwner ? (
            <div className="mt-3 max-w-xs">
              <CheckoutButton kind="business">Upgrade this group</CheckoutButton>
            </div>
          ) : null}
        </Alert>
      ) : null}
      {callError ? (
        <Alert variant="destructive" className="mx-4 mt-3">
          {callError}
        </Alert>
      ) : null}
      <ConversationCall conversationId={conversationId} />
      <MessageThread messages={messages} currentUserId={currentUserId} />
      <MessageComposer
        conversationId={conversationId}
        workspaceId={workspaceId}
        usedBytes={usedBytes}
        limitBytes={limitBytes}
        canVideoCall={canCall && !inThisCall && !liveCall}
        onVideoCall={() => void requestVideoCall()}
        canJoinCall={Boolean(canCall && liveCall && joinVideoCall && paidCalls && !inThisCall)}
        onJoinCall={
          liveCall && joinVideoCall
            ? async () => {
                setCallError(null);
                const error = await joinVideoCall(liveCall, peers);
                if (error) setCallError(error);
              }
            : undefined
        }
      />
    </section>
  );
}
