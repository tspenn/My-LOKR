"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPhoneInvite } from "@/lib/actions/invites";
import { formatPhoneForOwner, inviteCodeText } from "@/lib/phone";
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

export type PendingPhoneInvite = {
  id: string;
  phone_e164: string;
  phone_last4: string;
  status: "pending" | "awaiting_code" | "confirmed" | "accepted" | "revoked";
  otp_display: string | null;
  token: string;
  created_at: string;
};

export function PhoneInviteForm({
  pending,
}: {
  pending: PendingPhoneInvite[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [state, action, pendingSubmit] = useActionState(
    async (_prev: CreateResult, formData: FormData) => createPhoneInvite(formData),
    null,
  );

  useEffect(() => {
    const open = pending.some(
      (invite) => invite.status === "pending" || invite.status === "awaiting_code",
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
          Invite by phone. They cannot join from a forwarded link alone — they
          must type that same number, then a code you send by text or email.
        </p>
        <div className="space-y-2">
          <Label htmlFor="phone">Send invite to this phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
            required
          />
        </div>
        <Button type="submit" disabled={pendingSubmit}>
          {pendingSubmit ? "Creating invite…" : "Create invite"}
        </Button>
      </form>

      {state?.notice ? (
        <div className="space-y-2">
          <Label htmlFor="invite-notice">Send this first by text or email (no code in it)</Label>
          <Textarea id="invite-notice" readOnly rows={4} value={state.notice} />
          <Button type="button" variant="outline" onClick={() => copy(state.notice ?? "", "notice")}>
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
              <p className="font-medium">{formatPhoneForOwner(invite.phone_e164)}</p>
              {invite.status === "pending" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Waiting for them to open the link and type this number.
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
                    They confirmed this number. Send this code by text or email
                    to that person — not to anyone else:
                  </p>
                  <p className="text-2xl font-semibold tracking-widest">{invite.otp_display}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(inviteCodeText(invite.otp_display ?? ""), invite.id)}
                  >
                    {copied === invite.id ? "Copied" : "Copy code text"}
                  </Button>
                </div>
              ) : null}
              {invite.status === "confirmed" ? (
                <p className="text-sm text-muted-foreground">
                  Phone confirmed. They can finish creating their account.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
