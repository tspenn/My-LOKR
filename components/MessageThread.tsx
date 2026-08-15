"use client";

import { useEffect, useRef } from "react";
import { Paperclip } from "lucide-react";
import { formatFileSize, formatTimestamp } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import type { MessageWithDetails, Profile } from "@/types/database";

export function MessageThread({
  messages,
  currentUserId,
}: {
  messages: MessageWithDetails[];
  currentUserId: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8F8F7] px-6 py-12 text-center">
        <p className="text-lg text-[#6F6B66]">
          No messages yet. Write the first one below.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#F8F8F7] px-4 py-6 text-[#1F1F1F]">
      {messages.map((message) => {
        const mine = message.sender_id === currentUserId;
        const sender = message.sender as Profile | null;
        const name = sender?.display_name ?? "Someone";

        return (
          <li
            key={message.id}
            className={`flex max-w-[min(40rem,100%)] gap-3 ${
              mine ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <UserAvatar name={name} src={sender?.avatar_url} className="mt-1" />
            <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <p className="mb-1 text-sm text-[#6F6B66]">
                <span className="font-medium text-[#1F1F1F]">{name}</span>
                {" · "}
                <time dateTime={message.created_at}>
                  {formatTimestamp(message.created_at)}
                </time>
              </p>
              <div
                className={`rounded-2xl px-4 py-3 shadow-sm ${
                  mine
                    ? "rounded-tr-sm bg-[#E6F4F1] text-[#1F1F1F]"
                    : "rounded-tl-sm border border-[#D9D6D0] bg-white text-[#1F1F1F]"
                }`}
              >
                {message.body ? (
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                ) : null}
                {message.message_attachments?.length ? (
                  <ul className={`mt-3 space-y-2 ${message.body ? "" : ""}`}>
                    {message.message_attachments.map((attachment) => (
                      <li key={attachment.id} className="flex items-start gap-2">
                        <Paperclip className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <AttachmentPreview attachment={attachment} />
                          <p className="text-sm text-[#6F6B66]">
                            {formatFileSize(attachment.size_bytes)} · {attachment.mime_type}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}
