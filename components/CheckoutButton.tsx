"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/actions/workspace";

export function CheckoutButton({
  kind,
  children,
  variant = "default",
}: {
  kind: "business" | "vault50" | "vault100" | "vault250";
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        className="w-full"
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await startCheckout(kind);
          setPending(false);
          if (result.url) {
            window.location.href = result.url;
            return;
          }
          setError(result.error ?? "Checkout is not ready yet.");
        }}
      >
        {pending ? "Opening checkout…" : children}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
