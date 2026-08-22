import Image from "next/image";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { LogoForm } from "@/components/WorkspaceSettings";
import { PhoneInviteForm, type PendingPhoneInvite } from "@/components/PhoneInviteForm";
import { EmailInviteForm, type PendingEmailInvite } from "@/components/EmailInviteForm";
import { UsageMeter } from "@/components/UsageMeter";
import { DistributionListsSettings } from "@/components/DistributionListsSettings";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/profile";
import { formatPhoneForOwner } from "@/lib/phone";
import { PLANS } from "@/lib/billing";
import { LEGAL_CONTACT, TERMS } from "@/lib/legal";
import { SAFETY_COPY, TRAVEL_COPY } from "@/lib/safety";
import { SAMPLE_LOCKER_COPY, shareUrl } from "@/lib/sample-locker";
import { ShareLink } from "@/components/ShareLink";
import { BRAND } from "@/lib/brand";
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
  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-muted-foreground">
        Please sign in again.
      </div>
    );
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-medium">We could not load your profile yet</p>
        <p className="max-w-md text-muted-foreground">
          Confirm your email, then try again. Your messages are still safe.
        </p>
        <Link
          href="/setup"
          className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground"
        >
          Set up locker
        </Link>
      </div>
    );
  }
  const profile = profileFromRow(row);

  const { data: phoneRow } = await supabase
    .from("lokr_user_phones")
    .select("phone_e164")
    .eq("user_id", userId)
    .maybeSingle();

  const { workspace, sample } = await getCurrentWorkspace();
  const usage = workspace ? workspaceUsage(workspace, sample) : null;
  const [{ lists }, { people }] = await Promise.all([
    listDistributionLists(),
    listWorkspacePeople(),
  ]);

  const { data: inviteRows } = workspace
    ? await supabase
        .from("lokr_phone_invites")
        .select("id, phone_e164, phone_last4, status, otp_display, token, created_at")
        .eq("workspace_id", workspace.id)
        .in("status", ["pending", "awaiting_code", "confirmed", "accepted"])
        .order("created_at", { ascending: false })
    : { data: [] as PendingPhoneInvite[] };
  const { data: emailInviteRows } = workspace
    ? await supabase
        .from("lokr_email_invites")
        .select("id, email, email_hint, status, otp_display, token, created_at")
        .eq("workspace_id", workspace.id)
        .in("status", ["pending", "awaiting_code", "confirmed", "accepted"])
        .order("created_at", { ascending: false })
    : { data: [] as PendingEmailInvite[] };
  const pendingInvites = (inviteRows ?? []) as PendingPhoneInvite[];
  const pendingEmailInvites = (emailInviteRows ?? []) as PendingEmailInvite[];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <section>
        <Image
          src={BRAND.images.office}
          alt="A private office desk with a secure red phone, notebook, and pen, looking out on a stream of encrypted data"
          width={1792}
          height={1008}
          unoptimized
          sizes="100vw"
          className="h-auto w-full"
        />
      </section>
      <main className="mx-auto w-full max-w-xl space-y-8 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            This name is shown to people you write with inside this LOKR.
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
                This mark sits front and center on the dashboard. The badge shows
                your plan: Free, Business, or Enterprise.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogoForm />
            </CardContent>
          </Card>

          {sample ? (
            <Card>
              <CardHeader>
                <CardTitle>{SAMPLE_LOCKER_COPY.shareTitle}</CardTitle>
                <CardDescription>{SAMPLE_LOCKER_COPY.people}</CardDescription>
              </CardHeader>
              <CardContent>
                <ShareLink url={shareUrl()} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
              <CardDescription>
                {sample
                  ? SAMPLE_LOCKER_COPY.people
                  : "On Free you own one locker with 1–3 invitees (4 people including you). A 4th invitee, or live video in this locker, is Business — only you pay. People you invite stay free and can join that call. Private invites must be confirmed on the email or phone you sent them to, then a code — a forwarded link is not enough."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {people.length > 0 || profile ? (
                <ul className="space-y-3">
                  <li className="rounded-md border border-border bg-card px-4 py-3">
                    <p className="font-medium">{profile.display_name} (you)</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </li>
                  {people.map((person) => (
                    <li
                      key={person.id}
                      className="rounded-md border border-border bg-card px-4 py-3"
                    >
                      <p className="font-medium">{person.display_name}</p>
                      <p className="text-sm text-muted-foreground">{person.email}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {sample ? null : <EmailInviteForm pending={pendingEmailInvites} />}
              {sample ? null : <PhoneInviteForm pending={pendingInvites} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution lists</CardTitle>
              <CardDescription>
                Send the same private message to several people at once, each in
                their own thread. Not a group call, and not a stored video of
                your face.
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
              <CardTitle>Plans</CardTitle>
              <CardDescription>
                You are on {PLANS[workspace.plan].name}. Change this group’s plan
                or add Vault space from here — not from the main menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/pricing"
                className="inline-block font-medium text-primary underline-offset-2 hover:underline"
              >
                View plans
              </Link>
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
              <UsageMeter usedBytes={usage.used} limitBytes={usage.limit} />
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
            Set up your LOKR
          </Link>{" "}
          to load a logo and invite people.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{TRAVEL_COPY.title}</CardTitle>
          <CardDescription>{TRAVEL_COPY.short}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {TRAVEL_COPY.bullets.map((bullet) => (
            <p key={bullet}>{bullet}</p>
          ))}
        </CardContent>
      </Card>

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
    </div>
  );
}
