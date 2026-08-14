import { ConversationList } from "@/components/ConversationList";
import { InboxColumns } from "@/components/InboxColumns";
import { InboxRealtime } from "@/components/InboxRealtime";
import { getInbox } from "@/lib/actions/conversations";

export async function InboxShell({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: React.ReactNode;
}) {
  const { items } = await getInbox();

  return (
    <>
      <InboxRealtime />
      <InboxColumns
        list={<ConversationList items={items} currentUserId={currentUserId} />}
      >
        {children}
      </InboxColumns>
    </>
  );
}
