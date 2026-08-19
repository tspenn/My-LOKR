import { InboxShell } from "@/components/InboxShell";
import { NewConversationForm } from "@/components/NewConversationForm";
import { PhoneInviteForm, type PendingPhoneInvite } from "@/components/PhoneInviteForm";
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

  const { data: inviteRows } = await supabase
    .from("lokr_phone_invites")
    .select("id, phone_e164, phone_last4, status, otp_display, token, created_at")
    .eq("workspace_id", workspace.id)
        .in("status", ["pending", "awaiting_code", "confirmed", "accepted"])
    .order("created_at", { ascending: false });
  const pendingInvites = (inviteRows ?? []) as PendingPhoneInvite[];

  return (
    <InboxShell currentUserId={userId}>
      <div className="overflow-y-auto px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-2 text-2xl font-semibold">New message</h1>
          <p className="mb-8 text-muted-foreground">
            Write only to people already in this Lokr. Invite by phone below —
            they must confirm that same number before they can join.
          </p>
          <div className="mb-10 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-medium">Invite by phone</h2>
            <PhoneInviteForm pending={pendingInvites} />
          </div>
          <NewConversationForm people={people} />
        </div>
      </div>
    </InboxShell>
  );
}
