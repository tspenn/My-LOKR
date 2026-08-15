import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { InviteForm, LogoForm } from "@/components/WorkspaceSettings";
import { PhoneInviteForm, type PendingPhoneInvite } from "@/components/PhoneInviteForm";
import { UsageMeter } from "@/components/UsageMeter";
import { DistributionListsSettings } from "@/components/DistributionListsSettings";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/profile";
import { formatPhoneForOwner } from "@/lib/phone";
import { PLANS } from "@/lib/billing";
import { LEGAL_CONTACT, TERMS } from "@/lib/legal";
import { SAFETY_COPY } from "@/lib/safety";
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

  const { data: phoneRow } = await supabase
    .from("lokr_user_phones")
    .select("phone_e164")
    .eq("user_id", userId)
    .maybeSingle();

  const { workspace, memberCount } = await getCurrentWorkspace();
  const usage = workspace ? workspaceUsage(workspace) : null;
  const [{ lists }, { people }] = await Promise.all([
    listDistributionLists(),
    listWorkspacePeople(),
  ]);

  const { data: inviteRows } = workspace
    ? await supabase
        .from("lokr_phone_invites")
        .select("id, phone_e164, phone_last4, status, otp_display, token, created_at")
        .eq("workspace_id", workspace.id)
        .in("status", ["pending", "awaiting_code", "confirmed"])
        .order("created_at", { ascending: false })
    : { data: [] as PendingPhoneInvite[] };
  const pendingInvites = (inviteRows ?? []) as PendingPhoneInvite[];

  return (
    <main className="mx-auto w-full max-w-xl space-y-8 overflow-y-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            This name is shown to people you write with inside this Lokr.
            Sign in with this email
            {phoneRow?.phone_e164
              ? ` or ${formatPhoneForOwner(phoneRow.phone_e164)}`
              : " or a phone you confirmed on an invite"}
            , on a computer or your phone, as long as you have wifi.
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
                On Free, this group stays at 1–3 invitees (4 people including you).
                A 4th invitee is Business for this group only. Invitees never get
                a bill. Phone invites must be confirmed on the number you sent
                them to — a forwarded link is not enough.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <PhoneInviteForm pending={pendingInvites} />
              <InviteForm
                memberCount={memberCount}
                pendingCount={pendingInvites.length}
                maxUsers={usage.maxUsers}
              />
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

      <Card>
        <CardHeader>
          <CardTitle>{SAFETY_COPY.title}</CardTitle>
          <CardDescription>{SAFETY_COPY.short}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {SAFETY_COPY.bullets.map((bullet) => (
            <p key={bullet}>{bullet}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{TERMS.title}</CardTitle>
          <CardDescription>Last updated {TERMS.updated}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <p>{TERMS.intro}</p>
          {TERMS.sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="font-medium text-foreground">{section.title}</h3>
              <p className="text-muted-foreground">{section.body}</p>
            </div>
          ))}
          <p className="text-muted-foreground">
            Questions:{" "}
            <a
              href={`mailto:${LEGAL_CONTACT}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {LEGAL_CONTACT}
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
