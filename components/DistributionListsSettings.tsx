"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  createDistributionList,
  deleteDistributionList,
  type DistributionList,
} from "@/lib/actions/lists";
import type { InboxMember } from "@/types/database";

export function DistributionListsSettings({
  initialLists,
  people,
  currentUserId,
}: {
  initialLists: DistributionList[];
  people: InboxMember[];
  currentUserId: string;
}) {
  const [lists, setLists] = useState(initialLists);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    setError(null);
    const result = await createDistributionList(name, selected);
    setPending(false);
    if (result.error || !result.id) {
      setError(result.error ?? "We could not save that list.");
      return;
    }
    setLists((current) => [
      ...current,
      { id: result.id, name: name.trim(), created_by: currentUserId, member_ids: selected },
    ]);
    setName("");
    setSelected([]);
  }

  async function remove(id: string) {
    const result = await deleteDistributionList(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLists((current) => current.filter((list) => list.id !== id));
  }

  return (
    <div className="space-y-5">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <p className="text-sm text-muted-foreground">
        Send the same private message to several people at once. Each person
        receives it in their own thread.
      </p>
      {lists.length === 0 ? (
        <p className="text-muted-foreground">No lists yet.</p>
      ) : (
        <ul className="space-y-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-[#2A2A2A] px-3 py-3"
            >
              <div>
                <p className="font-medium">{list.name}</p>
                <p className="text-sm text-muted-foreground">{list.member_ids.length} people</p>
              </div>
              {list.created_by === currentUserId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void remove(list.id)}>
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="space-y-2">
          <Label htmlFor="list-name">New list</Label>
          <Input
            id="list-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Leadership, counsel, family"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">People</legend>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">Invite people to this LOKR first.</p>
          ) : (
            people.map((person) => (
              <label key={person.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(person.id)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, person.id]
                        : current.filter((id) => id !== person.id),
                    );
                  }}
                />
                {person.display_name}
              </label>
            ))
          )}
        </fieldset>
        <Button type="button" onClick={() => void create()} disabled={pending}>
          {pending ? "Saving…" : "Save list"}
        </Button>
      </div>
    </div>
  );
}
