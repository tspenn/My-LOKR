"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/ui/alert";
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
}: {
  nextPath: string;
  errorCode?: string;
}) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signInWithPassword(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your LOKR password with the email you signed up with, or the
          phone this invite was sent to. This password is only for LOKR — it
          does not change Friday Canvas or your other apps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {errorCode === "auth" ? (
          <Alert variant="destructive">
            That sign-in link was not valid. Please try again.
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
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
            Create an account
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">
            What LOKR is
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
