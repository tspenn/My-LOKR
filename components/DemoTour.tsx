"use client";

import { useState } from "react";
import Link from "next/link";
import { Paperclip, Send, Video } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_COPY,
  demoMessages,
  type Demo,
} from "@/lib/demo";
import { conversationTitle, formatTimestamp } from "@/lib/utils";

export function DemoTour({
  demo,
  signedIn,
}: {
  demo: Demo;
  signedIn: boolean;
}) {
  const { payload } = demo;
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const thread = threadId ? payload.threads[threadId] : null;

  function askToJoin() {
    setGateOpen(true);
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="rounded-md">
            <BrandMark />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#3F3F3F] bg-secondary px-3 py-0.5 text-sm text-[#C9C2B6]">
              Tour
            </span>
            {signedIn ? (
              <Button asChild size="sm">
                <Link href="/lockrs">Go to my locker</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/signup?from=demo">Open my own LOKR</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <Alert>{DEMO_COPY.banner}</Alert>
      </div>

      {thread && threadId ? (
        <section className="flex min-h-0 flex-1 flex-col bg-background">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {conversationTitle(thread.members, payload.visitorId, thread.subject)}
              </h1>
              <p className="text-muted-foreground">
                {thread.members.map((member) => member.display_name).join(" · ")}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setThreadId(null)}>
              Inbox
            </Button>
          </header>
          <MessageThread
            messages={demoMessages(thread, threadId)}
            currentUserId={payload.visitorId}
          />
          <form
            className="border-t border-border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              askToJoin();
            }}
          >
            <label htmlFor="demo-message-body" className="sr-only">
              Message
            </label>
            <Textarea
              id="demo-message-body"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a private message"
              rows={3}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={askToJoin}>
                  <Paperclip />
                  Attach file
                </Button>
                <Button type="button" variant="outline" onClick={askToJoin}>
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
      ) : (
        <div className="min-h-0 w-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-xl px-4 py-6">
            <p className="mb-3 text-sm text-muted-foreground">{payload.lockerName}</p>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {payload.inbox.map((item) => {
                const people = item.members;
                const title = conversationTitle(people, payload.visitorId, item.subject);
                const others = people.filter((member) => member.id !== payload.visitorId);
                const previewName = others[0]?.display_name ?? "You";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full gap-3 px-4 py-4 text-left hover:bg-muted/80"
                      onClick={() => setThreadId(item.id)}
                    >
                      <UserAvatar name={previewName} src={others[0]?.avatar_url} />
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {gateOpen ? (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-gate-title"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle id="demo-gate-title">Open your own LOKR</CardTitle>
              <CardDescription>{DEMO_COPY.sendGate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{DEMO_COPY.signupNote}</p>
              {signedIn ? (
                <Button asChild className="w-full">
                  <Link href="/lockrs">Go to my locker</Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/signup?from=demo">Create account</Link>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setGateOpen(false)}
              >
                Keep looking around
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
