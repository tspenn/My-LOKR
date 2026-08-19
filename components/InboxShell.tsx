import { ConversationList } from "@/components/ConversationList";
import { InboxRealtime } from "@/components/InboxRealtime";
import { LokrFooter } from "@/components/LokrFooter";
import { getInbox } from "@/lib/actions/conversations";

export async function InboxShell({ currentUserId }: { currentUserId: string }) {
  const { items } = await getInbox();

  return (
    <>
      <InboxRealtime />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-card">
        <ConversationList items={items} currentUserId={currentUserId} />
        <LokrFooter />
      </div>
    </>
  );
}
