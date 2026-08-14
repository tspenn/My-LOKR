"use client";

import { useActionState } from "react";
import { updateWorkspaceLogo, inviteWorkspaceMember } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

type Result = { error: string | null; message?: string } | null;

export function LogoForm() {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => updateWorkspaceLogo(formData),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state?.message ? <Alert>{state.message}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="logo">Replace logo</Label>
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save logo"}
      </Button>
    </form>
  );
}

export function InviteForm({
  memberCount,
  maxUsers,
}: {
  memberCount: number;
  maxUsers: number | null;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => inviteWorkspaceMember(formData),
    null,
  );
  const atLimit = maxUsers !== null && memberCount >= maxUsers;

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state?.message ? <Alert>{state.message}</Alert> : null}
      <p className="text-sm text-muted-foreground">
        {memberCount} active {memberCount === 1 ? "account" : "accounts"}
        {maxUsers ? ` · this plan allows ${maxUsers}` : " · custom seat count"}
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">Invite by email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="they@company.com"
          required
          disabled={atLimit}
        />
      </div>
      <Button type="submit" disabled={pending || atLimit}>
        {pending ? "Inviting…" : "Add person"}
      </Button>
    </form>
  );
}
