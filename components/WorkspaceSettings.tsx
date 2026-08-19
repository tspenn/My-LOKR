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
  pendingCount,
  maxUsers,
}: {
  memberCount: number;
  pendingCount: number;
  maxUsers: number | null;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => inviteWorkspaceMember(formData),
    null,
  );
  const used = memberCount + pendingCount;
  const atLimit = maxUsers !== null && used >= maxUsers;

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state?.message ? <Alert>{state.message}</Alert> : null}
      <p className="text-sm text-muted-foreground">
        {memberCount} of {maxUsers ?? "custom"} people already in this LOKR
        (including you)
        {pendingCount ? `, plus ${pendingCount} open phone invite${pendingCount === 1 ? "" : "s"}` : ""}
        .
        {maxUsers ? ` Remaining: ${Math.max(0, maxUsers - used)}.` : ""}{" "}
        Invitees do not pay
        {maxUsers === 4 ? ", and Free cannot issue 14 invites — that needs Business (15)." : "."}
      </p>
      <p className="text-sm text-muted-foreground">
        Already have a LOKR account? Add them by email. New people should use a
        phone invite above so join is confirmed on that number.
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">Add existing account by email</Label>
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
        {pending ? "Adding…" : "Add person"}
      </Button>
    </form>
  );
}
