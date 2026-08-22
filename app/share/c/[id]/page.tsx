import { notFound, redirect } from "next/navigation";
import { GuestThread } from "@/components/GuestLocker";
import { acceptSampleShare, ensureOwnLocker } from "@/lib/actions/share";
import { peekSampleConversation, peekSampleInbox } from "@/lib/share-data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Shared conversation" };
export const dynamic = "force-dynamic";

export default async function ShareConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const shared = await acceptSampleShare();
    if (!shared.workspaceId) await ensureOwnLocker();
    redirect(`/conversation/${id}`);
  }

  const [locker, thread] = await Promise.all([
    peekSampleInbox(),
    peekSampleConversation(id),
  ]);
  if (!locker || !thread) notFound();

  return (
    <GuestThread
      name={locker.name}
      workspaceId={thread.workspaceId}
      subject={thread.subject}
      members={thread.members}
      messages={thread.messages}
    />
  );
}
