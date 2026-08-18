import { JoinForm } from "@/components/JoinForm";
import { Alert } from "@/components/ui/alert";
import { peekInvite, readJoinTicket } from "@/lib/actions/invites";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Join" };
export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const peek = await peekInvite(token);
  if (!peek.ok) {
    return (
      <Alert variant="destructive">
        {peek.used
          ? "This invite was already used."
          : peek.expired
            ? "This invite has expired."
            : "This invite link is not valid."}
      </Alert>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const ticket = await readJoinTicket();
  const phoneConfirmed = Boolean(ticket);

  return (
    <JoinForm
      token={token}
      inviterName={peek.inviter_name ?? "Someone"}
      workspaceName={peek.workspace_name ?? "LOKR"}
      phoneLast4={peek.phone_last4 ?? "••••"}
      signedIn={signedIn}
      phoneConfirmed={phoneConfirmed}
    />
  );
}
