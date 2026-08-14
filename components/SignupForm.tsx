"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
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

export function SignupForm() {
  const [state, action, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signUp(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create your Lokr</CardTitle>
        <CardDescription>
          A locked space for proprietary messages. This is not a replacement for
          Microsoft or Google mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
