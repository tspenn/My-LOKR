"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { conversationTitle, formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import type { InboxItem } from "@/types/database";

export function ConversationList({
  items,
  currentUserId,
  linkPrefix = "/conversation",
  onCompose,
}: {
  items: InboxItem[];
  currentUserId: string;
  linkPrefix?: string;
  onCompose?: () => void;
}) {
  const pathname = usePathname();

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-medium">Your inbox is empty</p>
        <p className="text-muted-foreground">
          Start a private conversation when you are ready.
        </p>
        {onCompose ? (
          <button
            type="button"
            onClick={onCompose}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            New message
          </button>
        ) : (
          <Link
            href="/inbox/new"
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            New message
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((item) => {
        const href = `${linkPrefix}/${item.id}`;
        const active = pathname === href;
        const people = Array.isArray(item.members) ? item.members : [];
        const title = conversationTitle(people, currentUserId, item.subject);
        const others = people.filter((member) => member.id !== currentUserId);
        const previewName = others[0]?.display_name ?? "You";

        return (
          <li key={item.id}>
            <Link
              href={href}
              className={`flex gap-3 px-4 py-4 hover:bg-muted/80 ${
                active ? "bg-accent" : "bg-transparent"
              }`}
            >
              <UserAvatar
                name={previewName}
                src={others[0]?.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-foreground">{title}</p>
                  {item.unread_count > 0 ? (
                    <Badge aria-label={`${item.unread_count} unread`}>
                      {item.unread_count}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-muted-foreground">
                  {item.last_message_body || "No messages yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.last_message_at
                    ? formatTimestamp(item.last_message_at)
                    : formatTimestamp(item.updated_at)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
