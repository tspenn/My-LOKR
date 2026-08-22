import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark } from "@/components/BrandMark";
import { SAMPLE_LOCKER_COPY, isSampleLockerEmail } from "@/lib/sample-locker";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sample LOKR",
  description: "A real LOKR filled with fake data.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SampleLockerSignInPage() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      if (isSampleLockerEmail(profile?.email)) redirect("/inbox");
      redirect("/lockrs");
    }
  } catch {
    // Show the sign-in form if Supabase is not configured here.
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
      <main className="flex flex-1 justify-center px-4 pb-12">
        <LoginForm nextPath="/inbox" sample />
      </main>
    </div>
  );
}
