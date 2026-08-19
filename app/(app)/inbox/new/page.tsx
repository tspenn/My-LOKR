import { NewConversationForm } from "@/components/NewConversationForm";
import { listWorkspacePeople } from "@/lib/actions/calls";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const metadata = { title: "New conversation" };

export default async function NewMessagePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) redirect("/setup");

  const { people } = await listWorkspacePeople();

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-semibold">New conversation</h1>
        <p className="mb-8 text-muted-foreground">
          Choose who should be in this thread. That opens the writing panel —
          messages, files, and video. You can invite someone new from inside
          the conversation.
        </p>
        <NewConversationForm people={people} />
      </div>
    </div>
  );
}
