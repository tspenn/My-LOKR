import type { Profile } from "@/types/database";

export type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function displayNameFrom(row: {
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}) {
  return (row.full_name || row.display_name || row.email || "Someone").trim();
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email ?? "",
    display_name: displayNameFrom(row),
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}
