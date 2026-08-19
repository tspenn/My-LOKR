import { InboxShell } from "@/components/InboxShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  return <InboxShell currentUserId={userId} />;
}
