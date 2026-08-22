import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { UsageMeter } from "@/components/UsageMeter";
import { PLANS, VAULT_ADDONS, VAULT_DESCRIPTION } from "@/lib/billing";
import { getCurrentWorkspace, workspaceUsage } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Plans" };

const ENTERPRISE_EMAIL =
  process.env.NEXT_PUBLIC_ENTERPRISE_EMAIL ?? "hello@go-i-agency.com";

export default async function PricingPage() {
  const { workspace, memberCount, userId, demo } = await getCurrentWorkspace();
  const usage = workspace ? workspaceUsage(workspace, demo) : null;
  const isOwner = Boolean(workspace && userId && workspace.created_by === userId);

  return (
    <main className="mx-auto w-full max-w-5xl overflow-y-auto px-4 py-10">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
        <p className="mt-3 text-muted-foreground">
          Free is one locker you own: you plus 3 invitees, 1 GB, text, and
          attachments. No ads. People you invite do not get a bill — only the
          owner pays if that locker is upgraded. Invitees can join that locker’s
          live video on Free. A 4th invitee, or video in a locker you own, is
          Business for that locker only.
        </p>
      </header>

      {workspace && usage ? (
        <div className="mb-10 rounded-xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Current plan: <span className="text-foreground">{PLANS[workspace.plan].name}</span>
            {" · "}
            {memberCount} active {memberCount === 1 ? "account" : "accounts"}
            {usage.maxUsers ? ` (max ${usage.maxUsers})` : ""}
          </p>
          <UsageMeter usedBytes={usage.used} limitBytes={usage.limit} />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{PLANS.free.name}</CardTitle>
            <CardDescription>{PLANS.free.priceLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{PLANS.free.description}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {PLANS.free.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">{PLANS.free.limitations}</p>
            {workspace?.plan === "free" ? (
              <p className="text-sm font-medium text-primary">You are on Free.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Included when you create a LOKR.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{PLANS.business.name}</CardTitle>
            <CardDescription>{PLANS.business.priceLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{PLANS.business.description}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {PLANS.business.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Only the owner pays $19 a month for this group. Invitees stay free.
            </p>
            {workspace?.plan === "business" ? (
              <p className="text-sm font-medium text-primary">You are on Business.</p>
            ) : isOwner ? (
              <CheckoutButton kind="business">Upgrade this group</CheckoutButton>
            ) : workspace ? (
              <p className="text-sm text-muted-foreground">
                Only the owner can upgrade this group.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{PLANS.enterprise.name}</CardTitle>
            <CardDescription>{PLANS.enterprise.priceLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{PLANS.enterprise.description}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {PLANS.enterprise.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">{PLANS.enterprise.limitations}</p>
            {workspace?.plan === "enterprise" ? (
              <p className="text-sm font-medium text-primary">You are on Enterprise.</p>
            ) : (
              <Button asChild className="w-full" variant="outline">
                <a href={`mailto:${ENTERPRISE_EMAIL}?subject=LOKR%20Enterprise`}>
                  Contact us
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">The Vault</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{VAULT_DESCRIPTION}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {(["50", "100", "250"] as const).map((key) => {
            const addon = VAULT_ADDONS[key];
            const kind =
              key === "50" ? "vault50" : key === "100" ? "vault100" : "vault250";
            const current = workspace?.vault_addon === key;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>+{addon.gb} GB</CardTitle>
                  <CardDescription>${addon.priceMonthly} / month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Extra private storage on any plan, including Free.
                  </p>
                  {current ? (
                    <p className="text-sm font-medium text-primary">This Vault size is active.</p>
                  ) : isOwner ? (
                    <CheckoutButton kind={kind} variant="outline">
                      Add +{addon.gb} GB
                    </CheckoutButton>
                  ) : workspace ? (
                    <p className="text-sm text-muted-foreground">
                      Only the owner can add Vault space.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Need a workspace first?{" "}
        <Link href="/setup" className="text-primary underline-offset-2 hover:underline">
          Set up your LOKR
        </Link>
        .
      </p>
    </main>
  );
}
