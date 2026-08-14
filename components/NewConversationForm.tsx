"use client";

import { useMemo, useState, useTransition } from "react";
import { createConversation } from "@/lib/actions/conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { UserAvatar } from "@/components/UserAvatar";
import type { Profile } from "@/types/database";

export function NewConversationForm({ people }: { people: Profile[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.display_name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle),
    );
  }, [people, query]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  if (people.length === 0) {
    return (
      <Alert>
        Nobody else is in this Lokr yet. Invite them from Settings after they
        create an account.
      </Alert>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        selected.forEach((id) => formData.append("member_ids", id));
        startTransition(async () => {
          const result = await createConversation(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="space-y-2">
        <Label htmlFor="subject">Subject (optional)</Label>
        <Input
          id="subject"
          name="subject"
          maxLength={120}
          placeholder="For example: This week’s visit"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="people-search">Choose people</Label>
        <Input
          id="people-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
        />
        <ul className="max-h-72 overflow-y-auto rounded-md border border-border bg-card">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-muted-foreground">No matching people.</li>
          ) : (
            filtered.map((person) => {
              const checked = selected.includes(person.id);
              return (
                <li key={person.id} className="border-b border-border last:border-b-0">
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/70">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={checked}
                      onChange={() => toggle(person.id)}
                    />
                    <UserAvatar name={person.display_name} src={person.avatar_url} />
                    <span>
                      <span className="block font-medium">{person.display_name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {person.email}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? "Select at least one person."
            : `${selected.length} selected.`}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">First message (optional)</Label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          placeholder="Say hello in a private message"
        />
      </div>

      <Button type="submit" disabled={isPending || selected.length === 0}>
        {isPending ? "Starting conversation…" : "Start conversation"}
      </Button>
    </form>
  );
}
