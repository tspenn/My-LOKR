import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { listLockrs, MAX_LOCKRS } from "@/lib/workspace";
import { selectLokr } from "@/lib/actions/workspace";

export const metadata = { title: "Your Lockrs" };
export const dynamic = "force-dynamic";

export default async function LockrsPage() {
  const { lockrs } = await listLockrs();
  if (lockrs.length === 0) redirect("/setup");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a Lokr</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Work, family, and friends stay in separate spaces. People in one Lokr
          cannot see threads in another. Threads stay here until you delete them.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {lockrs.map((lokr) => (
          <li key={lokr.id}>
            <form action={selectLokr}>
              <input type="hidden" name="workspace_id" value={lokr.id} />
              <button
                type="submit"
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-[#2A2A2A] px-4 py-8 text-center transition-colors hover:border-primary hover:bg-[#333333]"
              >
                {lokr.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lokr.logoUrl}
                    alt=""
                    className="h-20 max-w-[12rem] object-contain"
                  />
                ) : (
                  <span className="text-2xl font-semibold">{lokr.name}</span>
                )}
                {lokr.logoUrl ? (
                  <span className="text-base font-medium">{lokr.name}</span>
                ) : null}
                <span className="rounded-full border border-[#3F3F3F] px-3 py-0.5 text-sm text-[#C9C2B6]">
                  {lokr.account_type === "business" ? "Business" : "Private"}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {lockrs.length < MAX_LOCKRS ? (
          <Button asChild>
            <Link href="/setup">Create another Lokr</Link>
          </Button>
        ) : null}
        <SignOutButton />
      </div>
      {lockrs.length >= MAX_LOCKRS ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          This account already has {MAX_LOCKRS} Lockrs, the maximum on Free.
        </p>
      ) : null}
    </main>
  );
}
