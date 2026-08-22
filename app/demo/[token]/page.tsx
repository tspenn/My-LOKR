import Link from "next/link";
import { DemoTour } from "@/components/DemoTour";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { getDemo } from "@/lib/demo-server";
import { DEMO_COPY } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const demo = await getDemo(token);

  if (!demo) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <BrandMark size="lg" />
        <h1 className="text-2xl font-semibold">{DEMO_COPY.ended}</h1>
        <p className="max-w-md text-muted-foreground">
          This link is not a locker and it cannot add you to anyone else. Open
          your own LOKR when you are ready.
        </p>
        <Button asChild>
          <Link href="/signup">Create account</Link>
        </Button>
      </main>
    );
  }

  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } catch {
    signedIn = false;
  }

  return <DemoTour demo={demo} signedIn={signedIn} />;
}
