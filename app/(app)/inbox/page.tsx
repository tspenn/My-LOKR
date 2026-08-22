import { redirect } from "next/navigation";
import { InboxShell } from "@/components/InboxShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ensureOwnLocker } from "@/lib/actions/share";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-muted-foreground">
        Please sign in again.
      </div>
    );
  }

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) {
    const opened = await ensureOwnLocker();
    if (opened.workspaceId) redirect("/inbox");
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-medium">Opening your LOKR…</p>
        <p className="max-w-md text-muted-foreground">
          Your account is ready. Refresh this page if the inbox does not open.
        </p>
      </div>
    );
  }

  return <InboxShell currentUserId={userId} />;
}
