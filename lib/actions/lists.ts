"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type DistributionList = {
  id: string;
  name: string;
  created_by: string;
  member_ids: string[];
};

export async function listDistributionLists() {
  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { lists: [] as DistributionList[], error: null };

  const supabase = await createClient();
  const { data: lists, error } = await supabase
    .from("lokr_distribution_lists")
    .select("id, name, created_by")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (error) return { lists: [] as DistributionList[], error: error.message };

  const { data: members } = await supabase
    .from("lokr_distribution_list_members")
    .select("list_id, user_id");

  return {
    error: null,
    lists: (lists ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      created_by: row.created_by,
      member_ids: (members ?? [])
        .filter((member) => member.list_id === row.id)
        .map((member) => member.user_id),
    })),
  };
}

export async function createDistributionList(name: string, memberIds: string[]) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name this list.", id: null };
  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your LOKR first.", id: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", id: null };

  const unique = [...new Set(memberIds.filter((id) => id && id !== user.id))];
  const { data, error } = await supabase
    .from("lokr_distribution_lists")
    .insert({
      workspace_id: workspace.id,
      name: trimmed,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "We could not save that list.", id: null };

  if (unique.length > 0) {
    const { error: memberError } = await supabase.from("lokr_distribution_list_members").insert(
      unique.map((user_id) => ({ list_id: data.id, user_id })),
    );
    if (memberError) return { error: "The list was created, but people could not be added.", id: data.id };
  }

  revalidatePath("/profile");
  return { error: null, id: data.id };
}

export async function deleteDistributionList(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lokr_distribution_lists").delete().eq("id", listId);
  if (error) return { error: "We could not remove that list." };
  revalidatePath("/profile");
  return { error: null };
}
