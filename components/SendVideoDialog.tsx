"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ensureDirectConversation, listWorkspacePeople } from "@/lib/actions/calls";
import { listDistributionLists, type DistributionList } from "@/lib/actions/lists";
import { sendFileToConversation } from "@/lib/send-attachment";
import { formatFileSize } from "@/lib/utils";
import type { InboxMember } from "@/types/database";

export function SendVideoDialog({
  file,
  workspaceId,
  defaultConversationId,
  onClose,
}: {
  file: File;
  workspaceId: string;
  defaultConversationId: string | null;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<InboxMember[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [mode, setMode] = useState<"here" | "person" | "list">(
    defaultConversationId ? "here" : "person",
  );
  const [personId, setPersonId] = useState("");
  const [listId, setListId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void listWorkspacePeople().then((result) => {
      setPeople(result.people);
      if (!personId && result.people[0]) setPersonId(result.people[0].id);
    });
    void listDistributionLists().then((result) => {
      setLists(result.lists);
      if (!listId && result.lists[0]) setListId(result.lists[0].id);
    });
    // Load destination options once when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    setPending(true);
    setError(null);
    const body = "Video message";
    try {
      if (mode === "here" && defaultConversationId) {
        const result = await sendFileToConversation({
          workspaceId,
          conversationId: defaultConversationId,
          file,
          body,
        });
        if (result.error) {
          setError(result.error);
          setPending(false);
          return;
        }
        onClose();
        return;
      }

      const destinations: string[] = [];
      if (mode === "person" && personId) {
        const opened = await ensureDirectConversation(personId);
        if (opened.error || !opened.conversationId) {
          setError(opened.error ?? "We could not open that conversation.");
          setPending(false);
          return;
        }
        destinations.push(opened.conversationId);
      }
      if (mode === "list" && listId) {
        const list = lists.find((item) => item.id === listId);
        if (!list || list.member_ids.length === 0) {
          setError("That list has no people yet.");
          setPending(false);
          return;
        }
        for (const memberId of list.member_ids) {
          const opened = await ensureDirectConversation(memberId);
          if (opened.conversationId) destinations.push(opened.conversationId);
        }
      }

      if (destinations.length === 0) {
        setError("Choose where this video should go.");
        setPending(false);
        return;
      }

      for (const conversationId of destinations) {
        const result = await sendFileToConversation({
          workspaceId,
          conversationId,
          file,
          body,
        });
        if (result.error) {
          setError(result.error);
          setPending(false);
          return;
        }
      }
      onClose();
    } catch {
      setError("We could not send that video.");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F1F1F]/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-[#3F3F3F] bg-[#2A2A2A] p-5 text-[#F8F8F7] shadow-xl">
        <h2 className="font-heading text-xl">Send video</h2>
        <p className="mt-1 text-sm text-[#A39E96]">
          {file.name} · {formatFileSize(file.size)}. Stored in locked private storage, not email.
        </p>
        {error ? (
          <Alert variant="destructive" className="mt-3">
            {error}
          </Alert>
        ) : null}
        <fieldset className="mt-4 space-y-3">
          <legend className="sr-only">Destination</legend>
          {defaultConversationId ? (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="video-dest"
                checked={mode === "here"}
                onChange={() => setMode("here")}
              />
              This conversation
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="video-dest"
              checked={mode === "person"}
              onChange={() => setMode("person")}
            />
            One person
          </label>
          {mode === "person" ? (
            <select
              className="h-12 w-full rounded-md border border-[#3F3F3F] bg-[#333333] px-3"
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="video-dest"
              checked={mode === "list"}
              onChange={() => setMode("list")}
            />
            Distribution list
          </label>
          {mode === "list" ? (
            lists.length === 0 ? (
              <p className="text-sm text-[#A39E96]">
                Create a list in Settings, then send to several people at once.
              </p>
            ) : (
              <select
                className="h-12 w-full rounded-md border border-[#3F3F3F] bg-[#333333] px-3"
                value={listId}
                onChange={(event) => setListId(event.target.value)}
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.member_ids.length})
                  </option>
                ))}
              </select>
            )
          ) : null}
        </fieldset>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void send()} disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
