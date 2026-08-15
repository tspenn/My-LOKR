"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithMagicLink, signInWithPassword } from "@/lib/actions/auth";
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
  const [magicState, magicAction, magicPending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signInWithMagicLink(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Messages and files stay in a private Supabase system — not Gmail, not
          Outlook, not Google Drive. Google and Microsoft do not see your content.
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center">
          <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <p className="relative mx-auto w-fit bg-card px-3 text-sm text-muted-foreground">
            Or use a sign-in link
          </p>
        </div>

        <form action={magicAction} className="space-y-4">
          {magicState?.error ? (
            <Alert variant="destructive">{magicState.error}</Alert>
          ) : null}
          {magicState?.message ? <Alert>{magicState.message}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={magicPending}
          >
            {magicPending ? "Sending link…" : "Email me a sign-in link"}
          </Button>
        </form>

        <p className="text-center text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
            Create an account
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">
            What My Lokr is
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
