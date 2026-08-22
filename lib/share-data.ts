import { createClient } from "@/lib/supabase/server";
import type { InboxItem, InboxMember, MessageWithDetails } from "@/types/database";

export type SharedInbox = {
  workspaceId: string;
  name: string;
  inbox: InboxItem[];
};

export type SharedThread = {
  workspaceId: string;
  subject: string | null;
  members: InboxMember[];
  messages: MessageWithDetails[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asMember(value: unknown): InboxMember | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.display_name !== "string") {
    return null;
  }
  return {
    id: row.id,
    display_name: row.display_name,
    email: typeof row.email === "string" ? row.email : "",
    avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
  };
}

function asInboxItem(value: unknown): InboxItem | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    subject: typeof row.subject === "string" ? row.subject : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    last_message_body:
      typeof row.last_message_body === "string" ? row.last_message_body : null,
    last_message_at:
      typeof row.last_message_at === "string" ? row.last_message_at : null,
    unread_count: typeof row.unread_count === "number" ? row.unread_count : 0,
    members: Array.isArray(row.members)
      ? row.members.map(asMember).filter((member): member is InboxMember => Boolean(member))
      : [],
  };
}

function asMessage(value: unknown): MessageWithDetails | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.sender_id !== "string") {
    return null;
  }
  const sender = asRecord(row.sender);
  return {
    id: row.id,
    conversation_id: typeof row.conversation_id === "string" ? row.conversation_id : "",
    sender_id: row.sender_id,
    body: typeof row.body === "string" ? row.body : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    sender: sender
      ? {
          id: typeof sender.id === "string" ? sender.id : row.sender_id,
          email: "",
          display_name:
            typeof sender.display_name === "string" ? sender.display_name : "Someone",
          avatar_url: typeof sender.avatar_url === "string" ? sender.avatar_url : null,
          created_at: "",
          updated_at: "",
        }
      : null,
    message_attachments: [],
  };
}

export async function peekSampleInbox(): Promise<SharedInbox | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_peek_sample_inbox");
  const row = asRecord(data);
  if (error || !row || row.ok !== true || typeof row.workspace_id !== "string") {
    return null;
  }
  return {
    workspaceId: row.workspace_id,
    name: typeof row.name === "string" ? row.name : "Shared LOKR",
    inbox: Array.isArray(row.inbox)
      ? row.inbox.map(asInboxItem).filter((item): item is InboxItem => Boolean(item))
      : [],
  };
}

export async function peekSampleConversation(id: string): Promise<SharedThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_peek_sample_conversation", {
    p_conversation_id: id,
  });
  const row = asRecord(data);
  if (error || !row || row.ok !== true || typeof row.workspace_id !== "string") {
    return null;
  }
  return {
    workspaceId: row.workspace_id,
    subject: typeof row.subject === "string" ? row.subject : null,
    members: Array.isArray(row.members)
      ? row.members.map(asMember).filter((member): member is InboxMember => Boolean(member))
      : [],
    messages: Array.isArray(row.messages)
      ? row.messages.map(asMessage).filter((message): message is MessageWithDetails => Boolean(message))
      : [],
  };
}
