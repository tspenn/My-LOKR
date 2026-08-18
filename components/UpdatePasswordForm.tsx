"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PasswordField } from "@/components/PasswordField";
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
        <CardTitle>Choose your LOKR password</CardTitle>
        <CardDescription>
          Use at least 12 characters. This password is only for LOKR. It does
          not change Friday Canvas or your other apps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          <PasswordField
            id="password"
            name="password"
            label="New LOKR password"
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm"
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save LOKR password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
