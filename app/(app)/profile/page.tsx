import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { InviteForm, LogoForm } from "@/components/WorkspaceSettings";
import { UsageMeter } from "@/components/UsageMeter";
import { DistributionListsSettings } from "@/components/DistributionListsSettings";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/profile";
import { PLANS } from "@/lib/billing";
import { getCurrentWorkspace, workspaceUsage } from "@/lib/workspace";
import { listDistributionLists } from "@/lib/actions/lists";
import { listWorkspacePeople } from "@/lib/actions/calls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (!row) redirect("/login");
  const profile = profileFromRow(row);

  const { workspace, memberCount } = await getCurrentWorkspace();
  const usage = workspace ? workspaceUsage(workspace) : null;
  const [{ lists }, { people }] = await Promise.all([
    listDistributionLists(),
    listWorkspacePeople(),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl space-y-8 overflow-y-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            This name is shown to people you write with inside this Lokr.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {workspace && usage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {workspace.account_type === "business" ? "Company logo" : "Your logo"}
              </CardTitle>
              <CardDescription>
                This mark sits front and center on the dashboard. The badge shows{" "}
                {workspace.account_type === "business" ? "Business" : "Private"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogoForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
              <CardDescription>
                Per-user pricing applies to active accounts. They must already have a Lokr login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm memberCount={memberCount} maxUsers={usage.maxUsers} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution lists</CardTitle>
              <CardDescription>
                Send a recorded video to several people as private messages, not a group call.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DistributionListsSettings
                initialLists={lists}
                people={people}
                currentUserId={userId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                {PLANS[workspace.plan].name} includes {PLANS[workspace.plan].storageLabel}.
                The Vault is extra private storage on top.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageMeter usedBytes={workspace.storage_used_bytes} limitBytes={usage.limit} />
              <Link
                href="/pricing"
                className="inline-block font-medium text-primary underline-offset-2 hover:underline"
              >
                Change plan or add Vault space
              </Link>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground">
          <Link href="/setup" className="text-primary underline-offset-2 hover:underline">
            Set up your Lokr
          </Link>{" "}
          to load a logo and invite people.
        </p>
      )}
    </main>
  );
}
