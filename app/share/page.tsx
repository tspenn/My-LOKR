import { redirect } from "next/navigation";
import { GuestInbox } from "@/components/GuestLocker";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";
import { acceptSampleShare, ensureOwnLocker } from "@/lib/actions/share";
import { peekSampleInbox } from "@/lib/share-data";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shared LOKR",
  description: "A real LOKR. Look around. Sign in only when you send or share.",
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

  const peeked = await peekSampleInbox();
  if (!peeked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold">This share is not open yet</h1>
        <p className="mt-3 text-muted-foreground">{SAMPLE_LOCKER_COPY.banner}</p>
      </main>
    );
  }

  return <GuestInbox name={peeked.name} items={peeked.inbox} />;
}
