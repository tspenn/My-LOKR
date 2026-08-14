import { InboxShell } from "@/components/InboxShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Inbox" };

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");
  return id;
}

export default async function InboxPage() {
  const userId = await currentUserId();

  return (
    <InboxShell currentUserId={userId}>
      <div className="hidden flex-1 items-center justify-center px-6 text-center md:flex">
        <div>
          <h1 className="text-2xl font-semibold">Your private inbox</h1>
          <p className="mt-2 max-w-md text-lg text-muted-foreground">
            Choose a conversation on the left, or start a new message. Nothing
            here is sent over internet email.
          </p>
        </div>
      </div>
    </InboxShell>
  );
}
