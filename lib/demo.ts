import { appOrigin } from "@/lib/site";
import type { InboxItem, InboxMember, MessageWithDetails } from "@/types/database";

/** Official X.com tour. Not a locker, not a seat, not a message to the publisher. */
export const OFFICIAL_DEMO_TOKEN = "5dd2214fa8bb1058933d64a7e5e1426a";

export const DEMO_COPY = {
  banner:
    "This is a tour. Check it out — nothing here is a real locker, and nothing is sent to anyone. Sign up to open your own LOKR. You will not join this one.",
  sendGate: "Sign up to send. This tour cannot message anyone.",
  ended: "This tour has ended.",
  signupNote:
    "This is a tour. Sign up for your own locker — you will not join this one.",
} as const;

const YOU = "11111111-1111-4111-8111-111111111111";
const JORDAN = "22222222-2222-4222-8222-222222222222";
const SAM = "33333333-3333-4333-8333-333333333333";
const TRAVEL = "44444444-4444-4444-8444-444444444444";
const DRAFT = "55555555-5555-4555-8555-555555555555";

export type DemoMember = InboxMember;

export type DemoInboxItem = InboxItem;

export type DemoMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

export type DemoThread = {
  subject: string | null;
  members: DemoMember[];
  messages: DemoMessage[];
};

export type DemoPayload = {
  visitorId: string;
  lockerName: string;
  inbox: DemoInboxItem[];
  threads: Record<string, DemoThread>;
};

export type Demo = {
  title: string;
  payload: DemoPayload;
};

const EMAIL_RE = /(?:[A-Za-z0-9._%+\-]+)@(?:[A-Za-z0-9.\-]+)\.[A-Za-z]{2,}/g;
const E164_RE = /\+[1-9]\d{7,14}\b/;

function member(
  id: string,
  display_name: string,
): DemoMember {
  return { id, display_name, email: "", avatar_url: null };
}

function collectStrings(value: unknown, into: string[]) {
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, into);
  }
}

export function payloadLooksPrivate(payload: unknown) {
  const strings: string[] = [];
  collectStrings(payload, strings);
  const blob = strings.join("\n");
  if (E164_RE.test(blob)) return true;
  const leftovers = blob.replace(
    /(?:[A-Za-z0-9._%+\-]+)@example\.invalid/gi,
    "",
  );
  return EMAIL_RE.test(leftovers);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asMember(value: unknown): DemoMember | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.display_name !== "string") {
    return null;
  }
  return {
    id: value.id,
    display_name: value.display_name,
    email: typeof value.email === "string" ? value.email : "",
    avatar_url: typeof value.avatar_url === "string" ? value.avatar_url : null,
  };
}

function asInboxItem(value: unknown): DemoInboxItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const members = Array.isArray(value.members)
    ? value.members.map(asMember).filter((row): row is DemoMember => Boolean(row))
    : [];
  return {
    id: value.id,
    subject: typeof value.subject === "string" ? value.subject : null,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : "",
    last_message_body:
      typeof value.last_message_body === "string" ? value.last_message_body : null,
    last_message_at:
      typeof value.last_message_at === "string" ? value.last_message_at : null,
    unread_count: typeof value.unread_count === "number" ? value.unread_count : 0,
    members,
  };
}

function asMessage(value: unknown): DemoMessage | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.sender_id !== "string" ||
    typeof value.sender_name !== "string" ||
    typeof value.body !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    sender_id: value.sender_id,
    sender_name: value.sender_name,
    body: value.body,
    created_at: value.created_at,
  };
}

function asThread(value: unknown): DemoThread | null {
  if (!isRecord(value)) return null;
  const members = Array.isArray(value.members)
    ? value.members.map(asMember).filter((row): row is DemoMember => Boolean(row))
    : [];
  const messages = Array.isArray(value.messages)
    ? value.messages.map(asMessage).filter((row): row is DemoMessage => Boolean(row))
    : [];
  if (members.length === 0 || messages.length === 0) return null;
  return {
    subject: typeof value.subject === "string" ? value.subject : null,
    members,
    messages,
  };
}

export function parseDemo(value: unknown): Demo | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const raw = value.payload;
  if (!title || !isRecord(raw) || typeof raw.visitorId !== "string") return null;
  if (typeof raw.lockerName !== "string") return null;
  const inbox = Array.isArray(raw.inbox)
    ? raw.inbox.map(asInboxItem).filter((row): row is DemoInboxItem => Boolean(row))
    : [];
  if (inbox.length === 0) return null;
  const threads: Record<string, DemoThread> = {};
  if (isRecord(raw.threads)) {
    for (const [id, thread] of Object.entries(raw.threads)) {
      const parsed = asThread(thread);
      if (parsed) threads[id] = parsed;
    }
  }
  if (inbox.some((item) => !threads[item.id])) return null;
  const payload: DemoPayload = {
    visitorId: raw.visitorId,
    lockerName: raw.lockerName,
    inbox,
    threads,
  };
  if (payloadLooksPrivate(payload)) return null;
  if (JSON.stringify(payload).length > 65536) return null;
  return { title, payload };
}

export function officialDemo(): Demo {
  const you = member(YOU, "You");
  const jordan = member(JORDAN, "Jordan Hale");
  const sam = member(SAM, "Sam Okoye");

  return {
    title: "A sample LOKR",
    payload: {
      visitorId: YOU,
      lockerName: "Sample locker",
      inbox: [
        {
          id: TRAVEL,
          subject: "Travel folder",
          created_at: "2026-08-20T14:02:00.000Z",
          updated_at: "2026-08-20T14:18:00.000Z",
          last_message_body: "When you land, the notes stay in this locker.",
          last_message_at: "2026-08-20T14:18:00.000Z",
          unread_count: 1,
          members: [you, jordan],
        },
        {
          id: DRAFT,
          subject: "Draft notes",
          created_at: "2026-08-19T16:10:00.000Z",
          updated_at: "2026-08-20T11:40:00.000Z",
          last_message_body: "I can add the outline tonight.",
          last_message_at: "2026-08-20T11:40:00.000Z",
          unread_count: 0,
          members: [you, jordan, sam],
        },
      ],
      threads: {
        [TRAVEL]: {
          subject: "Travel folder",
          members: [you, jordan],
          messages: [
            {
              id: "m-travel-1",
              sender_id: JORDAN,
              sender_name: "Jordan Hale",
              body: "I put the itinerary and the insurance PDF in this locker so they are not sitting in email.",
              created_at: "2026-08-20T14:02:00.000Z",
            },
            {
              id: "m-travel-2",
              sender_id: YOU,
              sender_name: "You",
              body: "Got them. I will keep the copies here.",
              created_at: "2026-08-20T14:11:00.000Z",
            },
            {
              id: "m-travel-3",
              sender_id: JORDAN,
              sender_name: "Jordan Hale",
              body: "When you land, the notes stay in this locker.",
              created_at: "2026-08-20T14:18:00.000Z",
            },
          ],
        },
        [DRAFT]: {
          subject: "Draft notes",
          members: [you, jordan, sam],
          messages: [
            {
              id: "m-draft-1",
              sender_id: SAM,
              sender_name: "Sam Okoye",
              body: "This is the kind of draft we would not put in Gmail.",
              created_at: "2026-08-19T16:10:00.000Z",
            },
            {
              id: "m-draft-2",
              sender_id: JORDAN,
              sender_name: "Jordan Hale",
              body: "Agreed. Invite-only, then we talk here.",
              created_at: "2026-08-19T16:22:00.000Z",
            },
            {
              id: "m-draft-3",
              sender_id: YOU,
              sender_name: "You",
              body: "I can add the outline tonight.",
              created_at: "2026-08-20T11:40:00.000Z",
            },
          ],
        },
      },
    },
  };
}

export function demoPath(token = OFFICIAL_DEMO_TOKEN) {
  return `/demo/${token}`;
}

export function demoUrl(token = OFFICIAL_DEMO_TOKEN) {
  return `${appOrigin()}${demoPath(token)}`;
}

export function demoMessages(
  thread: DemoThread,
  conversationId: string,
): MessageWithDetails[] {
  return thread.messages.map((message) => ({
    id: message.id,
    conversation_id: conversationId,
    sender_id: message.sender_id,
    body: message.body,
    created_at: message.created_at,
    updated_at: message.created_at,
    sender: {
      id: message.sender_id,
      email: "",
      display_name: message.sender_name,
      avatar_url: null,
      created_at: message.created_at,
      updated_at: message.created_at,
    },
    message_attachments: [],
  }));
}

