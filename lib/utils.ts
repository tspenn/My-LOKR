import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function conversationTitle(
  members: { id: string; display_name: string }[],
  currentUserId: string,
  subject?: string | null,
) {
  const trimmed = subject?.trim();
  if (trimmed) return trimmed;

  const others = members.filter((member) => member.id !== currentUserId);
  if (others.length === 0) return "Just you";
  return others.map((member) => member.display_name).join(", ");
}
