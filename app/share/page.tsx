import { redirect } from "next/navigation";
import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { BrandMark } from "@/components/BrandMark";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";
import { acceptSampleShare, ensureOwnLocker } from "@/lib/actions/share";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shared LOKR",
  description: "A real LOKR filled with fake data. Sign up and start using the app.",
};

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const shared = await acceptSampleShare();
    if (!shared.workspaceId) await ensureOwnLocker();
    redirect("/inbox");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center">
          <Link href="/" className="rounded-md">
            <BrandMark size="lg" />
          </Link>
          <p className="text-lg">{SAMPLE_LOCKER_COPY.banner}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 pb-12">
        <SignupForm share />
      </main>
    </div>
  );
}
