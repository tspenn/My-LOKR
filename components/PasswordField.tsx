"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength = 12,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </div>
  );
}
