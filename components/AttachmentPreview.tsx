"use client";

import { useState } from "react";
import { getAttachmentDownloadUrl } from "@/lib/actions/messages";
import type { MessageAttachment } from "@/types/database";

export function AttachmentPreview({
  attachment,
}: {
  attachment: MessageAttachment;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    setError(null);
    const result = await getAttachmentDownloadUrl(attachment.id);
    setPending(false);
    if (result.error || !result.url) {
      setError(result.error ?? "Download is not available.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="text-left font-medium underline-offset-2 hover:underline disabled:opacity-70"
      >
        {pending ? "Preparing download…" : attachment.file_name}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
