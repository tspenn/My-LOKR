"use client";

import { useActionState, useState } from "react";
import { createWorkspace } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

type Result = { error: string } | null;

export function WorkspaceSetupForm() {
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => {
      const result = await createWorkspace(formData);
      return result?.error ? { error: result.error } : null;
    },
    null,
  );

  return (
    <form action={action} className="space-y-6">
      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">This Lokr is for</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-[#2A2A2A] p-4">
          <input
            type="radio"
            name="account_type"
            value="personal"
            checked={accountType === "personal"}
            onChange={() => setAccountType("personal")}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-medium">Private</span>
            <span className="block text-sm text-muted-foreground">
              Personal use. The badge will say Private so everyone knows this is not a company space.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-[#2A2A2A] p-4">
          <input
            type="radio"
            name="account_type"
            value="business"
            checked={accountType === "business"}
            onChange={() => setAccountType("business")}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-medium">Business</span>
            <span className="block text-sm text-muted-foreground">
              Company or team. Load the company logo so people know they are in the business Lokr.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="name">
          {accountType === "business" ? "Company name" : "Name for this Lokr"}
        </Label>
        <Input
          id="name"
          name="name"
          required
          placeholder={accountType === "business" ? "Acme Partners" : "Family Lokr"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">
          {accountType === "business" ? "Company logo" : "Your logo"}
        </Label>
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
        />
        <p className="text-sm text-muted-foreground">
          This mark sits front and center after you open the app. PNG, JPG, or WebP, up to 2 MB.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your Lokr…" : "Open this Lokr"}
      </Button>
    </form>
  );
}
