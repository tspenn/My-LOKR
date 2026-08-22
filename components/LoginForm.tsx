"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/ui/alert";
import { DEMO_LOCKER_COPY, DEMO_LOGIN_EMAIL } from "@/lib/demo-account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthResult = { error: string | null; message?: string } | null;

export function LoginForm({
  nextPath,
  errorCode,
  demo = false,
}: {
  nextPath: string;
  errorCode?: string;
  demo?: boolean;
}) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signInWithPassword(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{demo ? DEMO_LOCKER_COPY.loginTitle : "Sign in"}</CardTitle>
        <CardDescription>
          {demo
            ? DEMO_LOCKER_COPY.loginLead
            : "Use your LOKR password with the email you signed up with, or the phone this invite was sent to. This password is only for LOKR — it does not change Friday Canvas or your other apps."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {errorCode === "auth" ? (
          <Alert variant="destructive">
            That confirmation link could not sign you in automatically. If you
            already confirmed, sign in here with your LOKR password.
          </Alert>
        ) : null}

        <form action={passwordAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          {passwordState?.error ? (
            <Alert variant="destructive">{passwordState.error}</Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email or phone</Label>
            <Input
              id="email"
              name="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="you@email.com or (555) 123-4567"
              defaultValue={demo ? DEMO_LOGIN_EMAIL : undefined}
              required
            />
          </div>
          <PasswordField
            id="password"
            name="password"
            label="LOKR password"
            autoComplete="current-password"
            minLength={1}
          />
          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center">
          <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
            Forgot your LOKR password?
          </Link>
        </p>

        <p className="text-center text-muted-foreground">
          {demo ? (
            <>
              First time?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                Create the Fred account
              </Link>
              {" "}
              with this email, then sign in here.
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                Create an account
              </Link>
            </>
          )}
          {" · "}
          <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">
            What LOKR is
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
