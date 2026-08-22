"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/ui/alert";
import { SAMPLE_LOCKER_COPY, SHARE_PATH } from "@/lib/sample-locker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthResult = { error: string | null; message?: string } | null;

export function SignupForm({ share = false }: { share?: boolean }) {
  const [state, action, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signUp(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{share ? "Create your account" : "Create your LOKR"}</CardTitle>
        <CardDescription>
          {share
            ? SAMPLE_LOCKER_COPY.loginLead
            : "For conversations and files you would not put in Gmail or Outlook — including patent ideas and proprietary work. Your LOKR password is only for this app. It does not change Friday Canvas or your other apps."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={share ? SHARE_PATH : "/inbox"} />
          {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          {state?.message ? <Alert>{state.message}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="display_name">Your name</Label>
            <Input
              id="display_name"
              name="display_name"
              autoComplete="name"
              required
            />
          </div>
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
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm"
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
          />
          <p className="text-sm text-muted-foreground">
            Use at least 12 characters, and a password you do not use on Google,
            Microsoft, or other mail.
          </p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : share ? "Open this LOKR" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={share ? `/login?next=${SHARE_PATH}` : "/login"}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Sign in
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
