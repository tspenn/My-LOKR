import Link from "next/link";
import { InboxShell } from "@/components/InboxShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

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
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-medium">Set up your LOKR first</p>
        <p className="max-w-md text-muted-foreground">
          A new account starts empty. Create your locker, then you can send messages.
        </p>
        <Button asChild>
          <Link href="/setup">Set up locker</Link>
        </Button>
      </div>
    );
  }

  return <InboxShell currentUserId={userId} />;
}
