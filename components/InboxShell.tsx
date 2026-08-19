import { ConversationList } from "@/components/ConversationList";
import { InboxRealtime } from "@/components/InboxRealtime";
import { getInbox } from "@/lib/actions/conversations";

export async function InboxShell({ currentUserId }: { currentUserId: string }) {
  const { items } = await getInbox();

  return (
    <>
      <InboxRealtime />
      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-4 py-6">
          <ConversationList items={items} currentUserId={currentUserId} />
        </div>
      </div>
    </>
  );
}
