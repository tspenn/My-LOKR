import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { COPY } from "@/lib/copy";
import { PLANS, VAULT_ADDONS, VAULT_DESCRIPTION } from "@/lib/billing";

const ENTERPRISE_EMAIL =
  process.env.NEXT_PUBLIC_ENTERPRISE_EMAIL ?? "hello@go-i-agency.com";

export const metadata = {
  title: "LOKR",
  description: COPY.meaning,
};

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <BrandMark />
          <nav className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <section className="grid items-start gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
            <div className="min-w-0 space-y-5 md:order-1">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {COPY.headline}
              </h1>
              <p className="text-xl font-medium">{COPY.meaning}</p>
              <p className="text-xl">{COPY.hook}</p>
              <p className="text-lg">{COPY.hookTwo}</p>
              <p className="text-lg">{COPY.intro}</p>
              <p className="text-lg">{COPY.notEmail}</p>
              <p className="text-lg font-medium">{COPY.noStore}</p>
              <p className="text-lg">{COPY.locked}</p>
              <p className="text-lg font-medium">{COPY.point}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild>
                  <Link href="/signup">Open a LOKR</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/demo">Try the demo</Link>
                </Button>
              </div>
            </div>
            <div className="order-first min-w-0 overflow-hidden rounded-2xl border border-border shadow-2xl [aspect-ratio:1200/1194] md:order-2">
              <Image
                src={BRAND.images.square}
                alt="Red secure desk phone with the LOKR mark, set against a stream of encrypted data"
                width={1200}
                height={1200}
                preload
                unoptimized
                sizes="(min-width: 768px) 50vw, 100vw"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </section>
        </div>

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

        <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:py-16">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{COPY.whyTitle}</h2>
            <ul className="list-disc space-y-2 pl-5">
              {COPY.why.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="max-w-3xl">{COPY.whether}</p>
          </section>

          <section className="space-y-6">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">{COPY.privacyTitle}</h2>
              <p>{COPY.privacyLead}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {COPY.privacy.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">{COPY.securityTitle}</h2>
              <p>{COPY.securityLead}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {COPY.security.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{COPY.vaultTitle}</h2>
            <p className="max-w-3xl">{COPY.vaultLead}</p>
            <ul className="list-disc space-y-2 pl-5">
              {COPY.vault.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="max-w-3xl">{COPY.vaultClose}</p>
          </section>

          <section className="space-y-4">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">{COPY.travelTitle}</h2>
              <p>{COPY.travelLead}</p>
            </div>
            <ul className="list-disc space-y-2 pl-5">
              {COPY.travelGood.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{COPY.travelWifiTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{COPY.travelWifiBody}</p>
                <p className="text-sm text-muted-foreground">{COPY.travelNot}</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{COPY.whoTitle}</h2>
            <ul className="list-disc space-y-2 pl-5">
              {COPY.who.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>It is</CardTitle>
                <CardDescription>{COPY.isAndIsNotTitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{COPY.itIs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>It is not</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{COPY.itIsNot}</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-8">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">Plans and prices</h2>
              <p>
                Free is one locker you own: you plus 3 invitees, 1 GB, text, and
                attachments. No ads. People you invite do not get a bill. They
                can join live video in a locker you upgrade, still on Free. A 4th
                invitee, or video in a locker they own, is Business for that
                locker only.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>{PLANS.free.name}</CardTitle>
                  <CardDescription>{PLANS.free.priceLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>{PLANS.free.description}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {PLANS.free.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-sm">{PLANS.free.limitations}</p>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>{PLANS.business.name}</CardTitle>
                  <CardDescription>{PLANS.business.priceLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>{PLANS.business.description}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {PLANS.business.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    Only the owner pays $19 a month for this locker. Invitees stay
                    free, including live video in this locker. If a Free user wants
                    video in a locker they own, they upgrade that locker. The call
                    is encrypted and not saved.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{PLANS.enterprise.name}</CardTitle>
                  <CardDescription>{PLANS.enterprise.priceLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>{PLANS.enterprise.description}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {PLANS.enterprise.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-sm">{PLANS.enterprise.limitations}</p>
                  <Button asChild className="w-full" variant="outline">
                    <a href={`mailto:${ENTERPRISE_EMAIL}?subject=LOKR%20Enterprise`}>
                      Contact us
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-semibold tracking-tight">The Vault</h3>
              <p className="max-w-3xl">{VAULT_DESCRIPTION}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {(["50", "100", "250"] as const).map((key) => {
                const addon = VAULT_ADDONS[key];
                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle>+{addon.gb} GB</CardTitle>
                      <CardDescription>${addon.priceMonthly} / month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Extra private storage on any plan, including Free.</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="flex flex-wrap gap-3 pb-8">
            <Button asChild>
              <Link href="/signup">Create your LOKR</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/demo">Try the demo</Link>
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
