import Link from "next/link";
import { NewConversationForm } from "@/components/NewConversationForm";
import { listWorkspacePeople } from "@/lib/actions/calls";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

export const metadata = { title: "New conversation" };

export default async function NewMessagePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const { workspace } = await getCurrentWorkspace();
  if (!userId || !workspace) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Set up your LOKR first</h1>
        <p className="text-muted-foreground">
          Create your locker before you start a conversation.
        </p>
        <Button asChild>
          <Link href="/setup">Set up locker</Link>
        </Button>
      </div>
    );
  }

  const { people } = await listWorkspacePeople();

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-semibold">New conversation</h1>
        <p className="mb-8 text-muted-foreground">
          Choose who should be in this thread. That opens the writing panel —
          messages, files, and a live call that is not saved. You can invite
          someone new from inside the conversation.
        </p>
        <NewConversationForm people={people} />
      </div>
    </div>
  );
}
