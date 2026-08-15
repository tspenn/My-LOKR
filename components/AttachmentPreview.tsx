"use client";

import { useEffect, useState } from "react";
import { getAttachmentDownloadUrl } from "@/lib/actions/messages";
import { isVideoMime, VIDEO_VIEW_SECONDS } from "@/lib/files";
import type { MessageAttachment } from "@/types/database";

export function AttachmentPreview({
  attachment,
}: {
  attachment: MessageAttachment;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const video = isVideoMime(attachment.mime_type);

  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    void getAttachmentDownloadUrl(attachment.id, VIDEO_VIEW_SECONDS).then((result) => {
      if (cancelled) return;
      if (result.url) setVideoUrl(result.url);
      else setError(result.error ?? "That video is not available.");
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.id, video]);

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

  if (video) {
    return (
      <div className="space-y-2">
        {videoUrl ? (
          <video
            className="max-h-72 w-full rounded-lg bg-[#1F1F1F]"
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
          >
            {attachment.file_name}
          </video>
        ) : (
          <p className="text-sm">{pending || !error ? "Preparing video…" : null}</p>
        )}
        <button
          type="button"
          onClick={download}
          disabled={pending}
          className="text-left font-medium underline-offset-2 hover:underline disabled:opacity-70"
        >
          {pending ? "Preparing download…" : `Download ${attachment.file_name}`}
        </button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
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
