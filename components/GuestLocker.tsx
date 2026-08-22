"use client";

import Link from "next/link";
import { ConversationList } from "@/components/ConversationList";
import { MessageComposer } from "@/components/MessageComposer";
import { MessageThread } from "@/components/MessageThread";
import { useSaveToHome } from "@/components/SaveToHome";
import { Button } from "@/components/ui/button";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";
import { conversationTitle } from "@/lib/utils";
import type { InboxItem, InboxMember, MessageWithDetails } from "@/types/database";

function GuestHeader({
  name,
  onUse,
}: {
  name: string;
  onUse: () => void;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <p className="text-2xl font-semibold tracking-tight">LOKR</p>
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">{name}</p>
        <div className="mt-3 flex justify-center gap-2">
          <Button type="button" variant="outline" onClick={onUse}>
            New message
          </Button>
          <Button type="button" onClick={onUse}>
            Share
          </Button>
        </div>
      </div>
      <p className="border-t border-border bg-card px-4 py-2 text-center text-sm">
        {SAMPLE_LOCKER_COPY.banner}
      </p>
    </header>
  );
}

export function GuestInbox({
  name,
  items,
}: {
  name: string;
  items: InboxItem[];
}) {
  const save = useSaveToHome();
  const ask = () => save?.askToUse();

  return (
    <div className="flex h-dvh flex-col bg-background">
      <GuestHeader name={name} onUse={() => ask()} />
      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-4 py-6">
          <ConversationList
            items={items}
            currentUserId=""
            linkPrefix="/share/c"
            onCompose={() => ask()}
          />
        </div>
      </div>
    </div>
  );
}

export function GuestThread({
  name,
  workspaceId,
  subject,
  members,
  messages,
}: {
  name: string;
  workspaceId: string;
  subject: string | null;
  members: InboxMember[];
  messages: MessageWithDetails[];
}) {
  const save = useSaveToHome();
  const ask = () => {
    save?.askToUse();
    return false;
  };
  const title = conversationTitle(members, "", subject);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <GuestHeader name={name} onUse={() => save?.askToUse()} />
      <section className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4">
          <div>
            <Link href="/share" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
              Inbox
            </Link>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">
              {members.map((member) => member.display_name).join(" · ")}
            </p>
          </div>
        </header>
        <MessageThread messages={messages} currentUserId="" />
        <MessageComposer
          conversationId="guest"
          workspaceId={workspaceId}
          usedBytes={0}
          limitBytes={1}
          onBeforeSend={ask}
        />
      </section>
    </div>
  );
}
