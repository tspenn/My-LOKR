"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEmailInvite } from "@/lib/actions/invites";
import { inviteEmailCodeText } from "@/lib/phone";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

type CreateResult = {
  error: string | null;
  notice: string | null;
  joinUrl?: string;
} | null;

export type PendingEmailInvite = {
  id: string;
  email: string;
  email_hint: string;
  status: "pending" | "awaiting_code" | "confirmed" | "accepted" | "revoked";
  otp_display: string | null;
  token: string;
  created_at: string;
};

export function EmailInviteForm({
  pending,
}: {
  pending: PendingEmailInvite[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pendingSubmit] = useActionState(
    async (_prev: CreateResult, formData: FormData) => createEmailInvite(formData),
    null,
  );

  useEffect(() => {
    const open = pending.some(
      (invite) =>
        invite.status === "pending" ||
        invite.status === "awaiting_code" ||
        invite.status === "confirmed",
    );
    if (!open) return;
    const timer = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
  }

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-4">
        {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
        <p className="text-sm text-muted-foreground">
          Email is only to prove they own that address. They cannot join from a
          forwarded link alone — they type that same email, then a code you send
          there. After that they use LOKR in the app. This is not email
          messaging, and they do not send or receive locker messages from that
          inbox.
        </p>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Send invite to this email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={pendingSubmit}>
          {pendingSubmit ? "Creating invite…" : "Create email invite"}
        </Button>
      </form>

      {state?.notice ? (
        <div className="space-y-2">
          <Label htmlFor="email-invite-notice">
            Send this first (no code in it)
          </Label>
          <Textarea id="email-invite-notice" readOnly rows={4} value={state.notice} />
          <Button
            type="button"
            variant="outline"
            onClick={() => copy(state.notice ?? "", "notice")}
          >
            {copied === "notice" ? "Copied" : "Copy invite text"}
          </Button>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <ul className="space-y-4">
          {pending.map((invite) => (
            <li
              key={invite.id}
              className="space-y-3 rounded-md border border-border bg-card p-4"
            >
              <p className="font-medium">{invite.email}</p>
              {invite.status === "pending" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Waiting for them to open the link and type this email.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      copy(
                        `My-LOKR.com — you are invited to LOKR Communications\n${PRODUCTION_ORIGIN}/join/${invite.token}`,
                        `link-${invite.id}`,
                      )
                    }
                  >
                    {copied === `link-${invite.id}` ? "Copied" : "Copy invite link again"}
                  </Button>
                </div>
              ) : null}
              {invite.status === "awaiting_code" && invite.otp_display ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    They confirmed this email. Send this code to that same
                    address — not to anyone else:
                  </p>
                  <p className="text-2xl font-semibold tracking-widest">{invite.otp_display}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(inviteEmailCodeText(invite.otp_display ?? ""), invite.id)}
                  >
                    {copied === invite.id ? "Copied" : "Copy code text"}
                  </Button>
                </div>
              ) : null}
              {invite.status === "confirmed" ? (
                <p className="text-sm text-muted-foreground">
                  Email confirmed. They can finish creating their account with
                  that same address.
                </p>
              ) : null}
              {invite.status === "accepted" ? (
                <p className="text-sm font-medium text-primary">
                  Invite accepted. They are in this LOKR.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
