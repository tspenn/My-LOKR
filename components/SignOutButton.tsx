"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

function SignOutPending({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  if (compact) {
    return (
      <button
        type="submit"
        aria-label={pending ? "Signing out" : "Sign out"}
        title="Sign out"
        disabled={pending}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary disabled:opacity-50"
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  }
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      <SignOutPending compact={compact} />
    </form>
  );
}
