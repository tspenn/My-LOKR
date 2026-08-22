"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Paperclip, Send, Settings, Video } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MessageThread } from "@/components/MessageThread";
import { UserAvatar } from "@/components/UserAvatar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_APP_COPY,
  DEMO_DEFAULT_EMAIL,
  DEMO_DEFAULT_NAME,
  newDemoId,
  demoAppMessages,
  seedDemoApp,
  type DemoAppState,
  type DemoPerson,
} from "@/lib/demo-app";
import { conversationTitle, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Screen = "inbox" | "compose" | "settings" | "thread";

function youPerson(state: DemoAppState): DemoPerson {
  return {
    id: state.visitorId,
    display_name: state.visitorName,
    email: "",
    avatar_url: null,
  };
}

export function DemoApp() {
  const [session, setSession] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [name, setName] = useState(DEMO_DEFAULT_NAME);
  const [email, setEmail] = useState(DEMO_DEFAULT_EMAIL);
  const [state, setState] = useState<DemoAppState | null>(null);
  const [screen, setScreen] = useState<Screen>("inbox");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [composeSelected, setComposeSelected] = useState<string[]>([]);
  const [composeBody, setComposeBody] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [gate, setGate] = useState<string | null>(null);

  const thread = threadId && state ? state.threads[threadId] : null;

  function openApp(event: React.FormEvent) {
    event.preventDefault();
    const displayName = name.trim() || DEMO_DEFAULT_NAME;
    setSession({ name: displayName, email: email.trim() || DEMO_DEFAULT_EMAIL });
    setState(seedDemoApp(displayName));
    setScreen("inbox");
  }

  function closeApp() {
    setSession(null);
    setState(null);
    setThreadId(null);
    setScreen("inbox");
    setDraft("");
    setComposeSelected([]);
    setComposeBody("");
  }

  function sendInThread() {
    if (!state || !threadId || !thread) return;
    const body = draft.trim();
    if (!body) {
      setGate("Write a message first. This sample does not store files or place calls.");
      return;
    }
    const now = new Date().toISOString();
    const message = {
      id: newDemoId("m"),
      sender_id: state.visitorId,
      sender_name: state.visitorName,
      body,
      created_at: now,
    };
    setState({
      ...state,
      threads: {
        ...state.threads,
        [threadId]: { ...thread, messages: [...thread.messages, message] },
      },
      inbox: state.inbox.map((item) =>
        item.id === threadId
          ? {
              ...item,
              last_message_body: body,
              last_message_at: now,
              updated_at: now,
              unread_count: 0,
            }
          : item,
      ),
    });
    setDraft("");
  }

  function startConversation() {
    if (!state) return;
    if (composeSelected.length === 0) return;
    const now = new Date().toISOString();
    const id = newDemoId("t");
    const members = [
      youPerson(state),
      ...state.people.filter((person) => composeSelected.includes(person.id)),
    ];
    const body = composeBody.trim();
    const messages = body
      ? [
          {
            id: newDemoId("m"),
            sender_id: state.visitorId,
            sender_name: state.visitorName,
            body,
            created_at: now,
          },
        ]
      : [];
    setState({
      ...state,
      threads: {
        ...state.threads,
        [id]: { subject: null, members, messages },
      },
      inbox: [
        {
          id,
          subject: null,
          created_at: now,
          updated_at: now,
          last_message_body: body || "No messages yet",
          last_message_at: body ? now : null,
          unread_count: 0,
          members,
        },
        ...state.inbox,
      ],
    });
    setComposeSelected([]);
    setComposeBody("");
    setThreadId(id);
    setScreen("thread");
  }

  function addPerson(event: React.FormEvent) {
    event.preventDefault();
    if (!state) return;
    const displayName = inviteName.trim();
    if (!displayName) return;
    setState({
      ...state,
      people: [...state.people, personFromName(displayName)],
    });
    setInviteName("");
  }

  const peopleLeft = useMemo(
    () => state?.people ?? [],
    [state],
  );

  if (!session || !state) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="px-6 py-8">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center">
            <Link href="/" className="rounded-md">
              <BrandMark size="lg" />
            </Link>
            <p className="text-lg">{DEMO_APP_COPY.banner}</p>
          </div>
        </header>
        <main className="flex flex-1 justify-center px-4 pb-12">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{DEMO_APP_COPY.signInTitle}</CardTitle>
              <CardDescription>{DEMO_APP_COPY.signInLead}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={openApp}>
                <div className="space-y-2">
                  <Label htmlFor="demo-name">Name</Label>
                  <Input
                    id="demo-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-email">Name tag</Label>
                  <Input
                    id="demo-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    inputMode="email"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is only a label on the sample. We do not send mail.
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Open the app
                </Button>
              </form>
              <p className="mt-6 text-center text-muted-foreground">
                Want a real locker?{" "}
                <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                  Create your LOKR
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b border-border bg-background">
        <div className="relative px-4 py-4">
          <div className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 md:block">
            <DemoAccount
              onLeave={closeApp}
              onSettings={() => setScreen("settings")}
            />
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                className={navClass(screen === "inbox" || screen === "thread")}
                onClick={() => {
                  setScreen("inbox");
                  setThreadId(null);
                }}
              >
                Inbox
              </button>
              <BrandMark />
              <button
                type="button"
                className={navClass(screen === "compose")}
                onClick={() => setScreen("compose")}
              >
                New message
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-center md:hidden">
            <DemoAccount
              onLeave={closeApp}
              onSettings={() => setScreen("settings")}
            />
          </div>
        </div>
      </header>

      <p className="border-b border-border bg-card px-4 py-2 text-center text-sm">
        {DEMO_APP_COPY.banner}
      </p>

      {screen === "thread" && thread && threadId ? (
        <section className="flex min-h-0 flex-1 flex-col bg-background">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {conversationTitle(thread.members, state.visitorId, thread.subject)}
              </h1>
              <p className="text-muted-foreground">
                {thread.members.map((member) => member.display_name).join(" · ")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setScreen("inbox");
                setThreadId(null);
              }}
            >
              Inbox
            </Button>
          </header>
          <MessageThread
            messages={demoAppMessages(thread, threadId)}
            currentUserId={state.visitorId}
          />
          <form
            className="border-t border-border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendInThread();
            }}
          >
            {gate ? (
              <Alert className="mb-3">
                {gate}{" "}
                <button
                  type="button"
                  className="font-medium underline-offset-2 hover:underline"
                  onClick={() => setGate(null)}
                >
                  Dismiss
                </button>
              </Alert>
            ) : null}
            <label htmlFor="demo-thread-body" className="sr-only">
              Message
            </label>
            <Textarea
              id="demo-thread-body"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a private message"
              rows={3}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setGate("This sample does not store files. A real LOKR keeps attachments in the locker.")
                  }
                >
                  <Paperclip />
                  Attach file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setGate("This sample does not place a live call. Video in a real locker is encrypted and not saved.")
                  }
                >
                  <Video />
                  Video call
                </Button>
              </div>
              <Button type="submit">
                <Send />
                Send
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {screen === "inbox" ? (
        <div className="min-h-0 w-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-xl px-4 py-6">
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {state.inbox.map((item) => {
                const others = item.members.filter((member) => member.id !== state.visitorId);
                const previewName = others[0]?.display_name ?? "You";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full gap-3 px-4 py-4 text-left hover:bg-muted/80"
                      onClick={() => {
                        setThreadId(item.id);
                        setScreen("thread");
                      }}
                    >
                      <UserAvatar name={previewName} src={others[0]?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold">
                            {conversationTitle(item.members, state.visitorId, item.subject)}
                          </p>
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {screen === "compose" ? (
        <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-xl space-y-6">
            <h1 className="text-2xl font-semibold">New conversation</h1>
            <p className="text-muted-foreground">
              Choose fake people already in this sample, or add more from
              Settings. Nothing is sent to a real locker.
            </p>
            {peopleLeft.length === 0 ? (
              <Alert>
                Add someone from Settings first. There is no invite cap in this
                sample.
              </Alert>
            ) : (
              <div className="space-y-3">
                {peopleLeft.map((person) => {
                  const checked = composeSelected.includes(person.id);
                  return (
                    <label
                      key={person.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setComposeSelected((current) =>
                            current.includes(person.id)
                              ? current.filter((id) => id !== person.id)
                              : [...current, person.id],
                          )
                        }
                      />
                      <UserAvatar name={person.display_name} />
                      <span className="font-medium">{person.display_name}</span>
                    </label>
                  );
                })}
                <Textarea
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  placeholder="First message (optional)"
                  rows={3}
                />
                <Button
                  type="button"
                  disabled={composeSelected.length === 0}
                  onClick={startConversation}
                >
                  Open thread
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {screen === "settings" ? (
        <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-xl space-y-6">
            <h1 className="text-2xl font-semibold">People</h1>
            <p className="text-muted-foreground">
              Add as many fake people as you want. They are only in this
              browser. A real LOKR is still you plus 3 invitees on Free.
            </p>
            <ul className="space-y-3">
              <li className="rounded-md border border-border bg-card px-4 py-3">
                <p className="font-medium">{state.visitorName} (you)</p>
                <p className="text-sm text-muted-foreground">{session.email}</p>
              </li>
              {state.people.map((person) => (
                <li
                  key={person.id}
                  className="rounded-md border border-border bg-card px-4 py-3"
                >
                  <p className="font-medium">{person.display_name}</p>
                </li>
              ))}
            </ul>
            <form className="space-y-3" onSubmit={addPerson}>
              <Label htmlFor="invite-name">Add a fake person</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Name"
              />
              <Button type="submit">Add</Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function personFromName(displayName: string): DemoPerson {
  return {
    id: newDemoId("p"),
    display_name: displayName,
    email: "",
    avatar_url: null,
  };
}

function navClass(active: boolean) {
  return cn(
    "rounded-md px-4 py-2 text-base font-medium",
    active ? "bg-[#C9C2B6] text-[#1F1F1F]" : "text-foreground hover:bg-secondary",
  );
}

function DemoAccount({
  onLeave,
  onSettings,
}: {
  onLeave: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="rounded-full border border-[#3F3F3F] bg-secondary px-3 py-0.5 text-sm text-[#C9C2B6]">
        {DEMO_APP_COPY.badge}
      </span>
      <button
        type="button"
        onClick={onLeave}
        className="whitespace-nowrap px-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Leave sample
      </button>
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary"
        onClick={onSettings}
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
