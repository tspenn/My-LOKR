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
import { COPY } from "@/lib/copy";

export const metadata = {
  title: "My Lokr",
  description: COPY.point,
};

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-[#1F1F1F]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
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

      <main className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:py-16">
        <section className="max-w-3xl space-y-5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {COPY.headline}
          </h1>
          <p className="text-xl text-muted-foreground">{COPY.hook}</p>
          <p className="text-lg text-muted-foreground">{COPY.hookTwo}</p>
          <p className="text-lg">{COPY.intro}</p>
          <p className="text-lg">{COPY.notEmail}</p>
          <p className="text-lg">{COPY.locked}</p>
          <p className="text-lg font-medium">{COPY.point}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/signup">Open a Lokr</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{COPY.whyTitle}</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            {COPY.why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="max-w-3xl">{COPY.whether}</p>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">{COPY.privacyTitle}</h2>
            <p className="text-muted-foreground">{COPY.privacyLead}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {COPY.privacy.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">{COPY.securityTitle}</h2>
            <p className="text-muted-foreground">{COPY.securityLead}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {COPY.security.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{COPY.vaultTitle}</h2>
          <p className="max-w-3xl text-muted-foreground">{COPY.vaultLead}</p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            {COPY.vault.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="max-w-3xl">{COPY.vaultClose}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{COPY.whoTitle}</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
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

        <section className="flex flex-wrap gap-3 pb-8">
          <Button asChild>
            <Link href="/signup">Create your Lokr</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
