"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
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

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => updatePassword(formData),
    null,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
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
            <Label htmlFor="confirm">Confirm new password</Label>
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
            {pending ? "Saving…" : "Save password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
