import type { InboxItem, InboxMember, MessageWithDetails } from "@/types/database";

export const DEMO_APP_COPY = {
  badge: "Sample",
  banner:
    "This is a sample of the app, not a LOKR. Nothing here is saved to a locker, and nobody is invited into a real one.",
  signInTitle: "Try the app",
  signInLead:
    "Type a name and open it. No email is sent. No account is created. You can add fake people and messages — they stay in this browser.",
} as const;

export const DEMO_DEFAULT_NAME = "Fred";
export const DEMO_DEFAULT_EMAIL = "fred@skylandapps.com";

const YOU = "demo-you";
const JORDAN = "demo-jordan";
const SAM = "demo-sam";
const TRAVEL = "demo-travel";
const DRAFT = "demo-draft";

export type DemoPerson = InboxMember;

export type DemoMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

export type DemoThread = {
  subject: string | null;
  members: DemoPerson[];
  messages: DemoMessage[];
};

export type DemoAppState = {
  visitorId: string;
  visitorName: string;
  people: DemoPerson[];
  inbox: InboxItem[];
  threads: Record<string, DemoThread>;
};

function person(id: string, display_name: string): DemoPerson {
  return { id, display_name, email: "", avatar_url: null };
}

export function newDemoId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function demoAppMessages(
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

export function seedDemoApp(visitorName: string): DemoAppState {
  const you = person(YOU, visitorName);
  const jordan = person(JORDAN, "Jordan Hale");
  const sam = person(SAM, "Sam Okoye");

  return {
    visitorId: YOU,
    visitorName,
    people: [jordan, sam],
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
            sender_name: visitorName,
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
            sender_name: visitorName,
            body: "I can add the outline tonight.",
            created_at: "2026-08-20T11:40:00.000Z",
          },
        ],
      },
    },
  };
}
