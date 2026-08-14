import { InboxShell } from "@/components/InboxShell";
import { NewConversationForm } from "@/components/NewConversationForm";
import { profileFromRow, type ProfileRow } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const metadata = { title: "New message" };

export default async function NewMessagePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) redirect("/setup");

  const { data: memberRows } = await supabase
    .from("lokr_workspace_members")
    .select("user_id, profiles(id, email, full_name, avatar_url, created_at, updated_at)")
    .eq("workspace_id", workspace.id)
    .neq("user_id", userId);

  const people = (memberRows ?? []).flatMap((row) => {
    const profile = row.profiles as unknown as ProfileRow | ProfileRow[] | null;
    if (!profile) return [];
    const rows = Array.isArray(profile) ? profile : [profile];
    return rows.map(profileFromRow);
  });

  return (
    <InboxShell currentUserId={userId}>
      <div className="overflow-y-auto px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-2 text-2xl font-semibold">New message</h1>
          <p className="mb-8 text-muted-foreground">
            Write only to people already in this Lokr. Invite others from Settings.
          </p>
          <NewConversationForm people={people} />
        </div>
      </div>
    </InboxShell>
  );
}
