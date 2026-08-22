"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  confirmInviteEmail,
  confirmInvitePhone,
  finishInviteIfSignedIn,
  finishInviteJoin,
  verifyInviteCode,
} from "@/lib/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PasswordField } from "@/components/PasswordField";
import { LokrMark } from "@/components/LokrMark";
import { lokrMark } from "@/lib/lokr-mark";

type AuthResult = {
  error: string | null;
  message?: string;
  wait?: boolean;
  confirmed?: boolean;
} | null;

export function JoinForm({
  token,
  kind,
  inviterName,
  workspaceName,
  phoneLast4,
  emailHint,
  signedIn,
  identityConfirmed,
}: {
  token: string;
  kind: "phone" | "email";
  inviterName: string;
  workspaceName: string;
  phoneLast4: string;
  emailHint: string;
  signedIn: boolean;
  identityConfirmed: boolean;
}) {
  const isEmail = kind === "email";
  const [step, setStep] = useState<"identity" | "code" | "account">(
    identityConfirmed ? "account" : "identity",
  );
  const [confirmedEmail, setConfirmedEmail] = useState("");

  const [identityState, identityAction, identityPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => {
      const result = isEmail
        ? await confirmInviteEmail(formData)
        : await confirmInvitePhone(formData);
      if (!result.error) {
        setConfirmedEmail(String(formData.get("email") ?? "").trim().toLowerCase());
        setStep("code");
      }
      return result;
    },
    null,
  );

  const [codeState, codeAction, codePending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => {
      const result = await verifyInviteCode(formData);
      if (!result.error) setStep("account");
      return result;
    },
    null,
  );

  const [accountState, accountAction, accountPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => finishInviteJoin(formData),
    null,
  );

  const [enterState, enterAction, enterPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => finishInviteIfSignedIn(formData),
    null,
  );

  const mark = lokrMark(workspaceName);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LokrMark letters={mark} />
        <h1 className="text-2xl font-semibold tracking-tight">Join this LOKR</h1>
        <p className="text-muted-foreground">
          You have been invited by {inviterName} to {workspaceName} for
          conversations that are secure and private.
        </p>
      </div>

      {step === "identity" ? (
        <form action={identityAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {identityState?.error ? (
            <Alert variant="destructive">{identityState.error}</Alert>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {isEmail
              ? `This invite was sent to ${emailHint || "one email"}. Type that exact address so we know it is you. A forwarded link opened by someone else will not work. This does not mean you use LOKR by email — email only confirms the invite.`
              : `This invite was sent to a phone number ending in ${phoneLast4}. Type that full number. A forwarded link on a different phone will not work.`}
          </p>
          <div className="space-y-2">
            <Label htmlFor={isEmail ? "email" : "phone"}>
              {isEmail ? "Email this invite was sent to" : "Phone this invite was sent to"}
            </Label>
            {isEmail ? (
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={emailHint || "name@example.com"}
                required
              />
            ) : (
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(555) 123-4567"
                required
              />
            )}
          </div>
          <Button type="submit" className="w-full" disabled={identityPending}>
            {identityPending
              ? "Checking…"
              : isEmail
                ? "Confirm this email"
                : "Confirm this phone"}
          </Button>
        </form>
      ) : null}

      {step === "code" ? (
        <form action={codeAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {codeState?.error ? <Alert variant="destructive">{codeState.error}</Alert> : null}
          <Alert>
            {isEmail
              ? "Enter the 6-digit code sent to that same email. The person who invited you will send it there. It is not in the first invite message on purpose — so a forwarded link is not enough."
              : "Enter the 6-digit code sent to that same number. The person who invited you will text it there. It is not in the first invite message on purpose — so a forwarded link is not enough."}
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="otp">
              {isEmail ? "Code from that email" : "Code from that phone"}
            </Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={codePending}>
            {codePending ? "Checking…" : "Confirm the code"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setStep("identity")}
          >
            {isEmail ? "Use a different email" : "Use a different number"}
          </button>
        </form>
      ) : null}

      {step === "account" ? (
        <div className="space-y-4">
          <Alert>
            {isEmail
              ? "That email is confirmed for the invite only. You use LOKR in the app with a LOKR password — not from your mail."
              : "That phone is confirmed. This join is tied to the number the invite was sent to."}
          </Alert>
          {signedIn ? (
            <form action={enterAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {enterState?.error ? (
                <Alert variant="destructive">{enterState.error}</Alert>
              ) : null}
              {isEmail ? (
                <p className="text-sm text-muted-foreground">
                  Sign in with the LOKR account for the invited email, then enter
                  the locker in the app.
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={enterPending}>
                {enterPending ? "Opening…" : "Enter this LOKR"}
              </Button>
            </form>
          ) : (
            <form action={accountAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {accountState?.error ? (
                <Alert variant="destructive">{accountState.error}</Alert>
              ) : null}
              {accountState?.message ? <Alert>{accountState.message}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="display_name">Your name</Label>
                <Input id="display_name" name="display_name" autoComplete="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={isEmail ? confirmedEmail : ""}
                  readOnly={isEmail && Boolean(confirmedEmail)}
                  required
                />
              </div>
              <PasswordField
                id="password"
                name="password"
                label="Password"
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm"
                name="confirm"
                label="Confirm password"
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                {isEmail
                  ? "Use at least 12 characters. That email only locked the invite to you. A LOKR password is how you open the app. Messages stay in LOKR — they are not sent by email."
                  : "Use at least 12 characters. This LOKR password is only for this app — it does not change Friday Canvas or your other apps. After this, you can sign in with this email or this phone."}
              </p>
              <Button type="submit" className="w-full" disabled={accountPending}>
                {accountPending ? "Creating account…" : "Create account and join"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href={`/login?next=/join/${encodeURIComponent(token)}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
