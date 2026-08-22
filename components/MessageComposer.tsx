"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Paperclip, Send, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { UsageMeter } from "@/components/UsageMeter";
import { createClient } from "@/lib/supabase/client";
import { fileValidationMessage, sanitizeFileName } from "@/lib/files";
import { createMessagePlaceholder } from "@/lib/actions/messages";
import { formatFileSize } from "@/lib/utils";
import { usageWarning } from "@/lib/billing";

export function MessageComposer({
  conversationId,
  workspaceId,
  usedBytes,
  limitBytes,
  canVideoCall,
  onVideoCall,
  canJoinCall,
  onJoinCall,
  onBeforeSend,
}: {
  conversationId: string;
  workspaceId: string;
  usedBytes: number;
  limitBytes: number;
  canVideoCall?: boolean;
  onVideoCall?: () => Promise<void> | void;
  canJoinCall?: boolean;
  onJoinCall?: () => Promise<void> | void;
  onBeforeSend?: () => boolean;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const warning = usageWarning(
    limitBytes <= 0 ? 0 : (usedBytes / limitBytes) * 100,
  );
  const blocked = warning === "full";

  function onFilesChosen(list: FileList | null) {
    if (!list) return;
    if (blocked) {
      setError("Storage is full. Add Vault space to attach a file.");
      return;
    }
    const next: File[] = [];
    for (const file of Array.from(list)) {
      const message = fileValidationMessage(file);
      if (message) {
        setError(message);
        return;
      }
      next.push(file);
    }
    setError(null);
    setFiles((current) => [...current, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function send() {
    if (onBeforeSend && !onBeforeSend()) return;
    const trimmed = body.trim();
    if (!trimmed && files.length === 0) {
      setError("Write a message or attach a file.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const extraBytes = files.reduce((sum, file) => sum + file.size, 0);
      const created = await createMessagePlaceholder(
        conversationId,
        trimmed,
        extraBytes,
      );
      if (created.error || !created.messageId) {
        setError(created.error ?? "We could not send that message.");
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        for (const file of files) {
          const path = `${workspaceId}/${conversationId}/${created.messageId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from("lokr-attachments")
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (uploadError) {
            setError(`The message was sent, but ${file.name} could not be attached.`);
            return;
          }
          const { error: rowError } = await supabase.from("lokr_message_attachments").insert({
            message_id: created.messageId,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
          });
          if (rowError) {
            setError(`The message was sent, but ${file.name} could not be attached.`);
            return;
          }
        }
      }

      setBody("");
      setFiles([]);
    });
  }

  return (
    <form
      className="border-t border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="mb-3">
        <UsageMeter usedBytes={usedBytes} limitBytes={limitBytes} compact />
      </div>
      {error ? (
        <Alert variant="destructive" className="mb-3">
          {error}{" "}
          {blocked || error.includes("Vault") ? (
            <Link href="/pricing" className="font-medium underline-offset-2 hover:underline">
              Open plans
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {files.length > 0 ? (
        <ul className="mb-3 space-y-1 text-sm">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3">
              <span>
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <Textarea
        id="message-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a private message"
        rows={3}
        disabled={isPending}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            id="message-files"
            type="file"
            className="sr-only"
            multiple
            onChange={(event) => onFilesChosen(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onBeforeSend && !onBeforeSend()) return;
              fileInputRef.current?.click();
            }}
            disabled={isPending || blocked}
          >
            <Paperclip />
            Attach file
          </Button>
          {canJoinCall && onJoinCall ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onBeforeSend && !onBeforeSend()) return;
                void onJoinCall();
              }}
              disabled={isPending}
            >
              <Video />
              Join call
            </Button>
          ) : null}
          {canVideoCall && onVideoCall ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onBeforeSend && !onBeforeSend()) return;
                void onVideoCall();
              }}
              disabled={isPending}
            >
              <Video />
              Video call
            </Button>
          ) : null}
        </div>
        <Button type="submit" disabled={isPending}>
          <Send />
          {isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
