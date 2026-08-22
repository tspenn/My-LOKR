"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{SAMPLE_LOCKER_COPY.shareLead}</p>
      <Input readOnly value={url} aria-label="Share link" />
      <Button type="button" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy share link"}
      </Button>
    </div>
  );
}
