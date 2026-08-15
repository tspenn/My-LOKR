"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthResult = { error: string | null; message?: string } | null;

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => requestPasswordReset(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          We will email a reset link if that address has a Lokr account. This
          resets only your My Lokr password — not Friday Canvas or your other
          apps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          {state?.message ? <Alert>{state.message}</Alert> : null}
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Link href="/login" className="text-primary underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
