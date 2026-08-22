import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark } from "@/components/BrandMark";
import { DEMO_LOCKER_COPY, isDemoEmail } from "@/lib/demo-account";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Try LOKR",
  description: "Public LOKR demo. Nothing secret.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DemoSignInPage() {
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
      if (isDemoEmail(profile?.email)) redirect("/inbox");
      redirect("/lockrs");
    }
  } catch {
    // No Supabase env — still show the sign-in form.
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center">
          <Link href="/" className="rounded-md">
            <BrandMark size="lg" />
          </Link>
          <p className="text-lg">{DEMO_LOCKER_COPY.banner}</p>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-12">
        <LoginForm nextPath="/inbox" demo />
      </main>
    </div>
  );
}
