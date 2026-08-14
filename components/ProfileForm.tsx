"use client";

import { useActionState } from "react";
import { updateDisplayName } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import type { Profile } from "@/types/database";

type Result = { error: string | null; message?: string } | null;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => updateDisplayName(formData),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state?.message ? <Alert>{state.message}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile.email} readOnly disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
