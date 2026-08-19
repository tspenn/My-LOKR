import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { LokrMark } from "@/components/LokrMark";
import { Button } from "@/components/ui/button";
import { listLockrs } from "@/lib/workspace";
import { selectLokr } from "@/lib/actions/workspace";

export const metadata = { title: "Your Lockrs" };
export const dynamic = "force-dynamic";

export default async function LockrsPage() {
  const { lockrs } = await listLockrs();
  if (lockrs.length === 0) redirect("/setup");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a LOKR</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          One group you own is free with up to 3 invitees. Add another group —
          family, work, a friend — and that one is free too, as long as it also
          stays at 3 invitees. A 4th person in any one group is Business for
          that group only. Tiles use the owner’s logo, or four letters.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {lockrs.map((lokr) => (
          <li key={lokr.id}>
            <form action={selectLokr}>
              <input type="hidden" name="workspace_id" value={lokr.id} />
              <button
                type="submit"
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-8 text-center transition-colors hover:border-primary hover:bg-card"
              >
                {lokr.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lokr.logoUrl}
                    alt=""
                    className="h-20 max-w-[12rem] object-contain"
                  />
                ) : (
                  <LokrMark letters={lokr.mark} />
                )}
                <span className="text-base font-medium">{lokr.name}</span>
                <span className="rounded-full border border-[#3F3F3F] px-3 py-0.5 text-sm text-[#C9C2B6]">
                  {lokr.invited
                    ? "Invited · free"
                    : lokr.plan === "business"
                      ? "Yours · Business"
                      : lokr.plan === "enterprise"
                        ? "Yours · Enterprise"
                        : "Yours · free (1–3 invitees)"}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/setup">Create another LOKR</Link>
        </Button>
        <SignOutButton />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Creating another group is free while each stays at 1–3 invitees.
      </p>
    </main>
  );
}
