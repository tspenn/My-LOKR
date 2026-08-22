"use server";

import { isSharePath } from "@/lib/sample-locker";
import { createClient } from "@/lib/supabase/server";
import { writeWorkspaceCookie } from "@/lib/workspace";

export async function acceptSampleShare() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_accept_sample_share");
  if (error || !data) {
    return { error: error?.message ?? "This share is not open yet.", workspaceId: null };
  }
  await writeWorkspaceCookie(data);
  return { error: null, workspaceId: data as string };
}

export async function ensureOwnLocker() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_ensure_own_workspace");
  if (data) {
    await writeWorkspaceCookie(data);
    return { error: null, workspaceId: data as string };
  }

  const { data: created, error: createError } = await supabase.rpc(
    "lokr_create_workspace",
    {
      p_name: "My LOKR",
      p_account_type: "personal",
    },
  );
  if (created) {
    await writeWorkspaceCookie(created);
    return { error: null, workspaceId: created as string };
  }

  return {
    error: error?.message ?? createError?.message ?? "We could not open your LOKR.",
    workspaceId: null,
  };
}

export async function openLockerAfterAuth(next?: string | null) {
  if (isSharePath(next)) {
    const shared = await acceptSampleShare();
    if (shared.workspaceId) return shared;
  }
  return ensureOwnLocker();
}
