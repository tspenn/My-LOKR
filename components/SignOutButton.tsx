"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

function SignOutPending() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SignOutPending />
    </form>
  );
}
