"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/files";
import { FREE_OWNED_LOCKRS, type AccountType } from "@/lib/billing";
import {
  getCurrentWorkspace,
  listLockrs,
  writeWorkspaceCookie,
} from "@/lib/workspace";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "personal") as AccountType;
  if (!name) return { error: "Please name this LOKR." };

  const { ownedCount } = await listLockrs();
  if (ownedCount >= FREE_OWNED_LOCKRS) {
    return { error: "You already have your LOKR. Invitees can still add you to theirs." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_create_workspace", {
    p_name: name,
    p_account_type: accountType === "business" ? "business" : "personal",
  });
  if (error || !data) {
    return { error: error?.message ?? "We could not set up your LOKR." };
  }

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const path = `${data}/${crypto.randomUUID()}-${sanitizeFileName(logo.name)}`;
    const { error: uploadError } = await supabase.storage.from("lokr-logos").upload(path, logo, {
      contentType: logo.type || "image/png",
      upsert: true,
    });
    if (!uploadError) {
      await supabase.rpc("lokr_set_workspace_logo", {
        p_workspace_id: data,
        p_logo_path: path,
      });
    }
  }

  await writeWorkspaceCookie(data);
  revalidatePath("/inbox");
  revalidatePath("/lockrs");
  redirect("/inbox");
}

export async function selectLokr(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const { lockrs } = await listLockrs();
  if (!lockrs.some((lokr) => lokr.id === workspaceId)) {
    redirect("/lockrs");
  }
  await writeWorkspaceCookie(workspaceId);
  revalidatePath("/inbox");
  redirect("/inbox");
}

export async function updateWorkspaceLogo(formData: FormData) {
  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your LOKR first." };
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return { error: "Please choose a logo image." };
  }
  if (logo.size > 2 * 1024 * 1024) {
    return { error: "Logo must be 2 MB or smaller." };
  }

  const supabase = await createClient();
  const path = `${workspace.id}/${crypto.randomUUID()}-${sanitizeFileName(logo.name)}`;
  const { error: uploadError } = await supabase.storage.from("lokr-logos").upload(path, logo, {
    contentType: logo.type || "image/png",
    upsert: true,
  });
  if (uploadError) return { error: "We could not save that logo." };

  const { error } = await supabase.rpc("lokr_set_workspace_logo", {
    p_workspace_id: workspace.id,
    p_logo_path: path,
  });
  if (error) return { error: "We could not save that logo." };

  revalidatePath("/inbox");
  revalidatePath("/profile");
  revalidatePath("/lockrs");
  return { error: null, message: "Logo saved." };
}


export async function startCheckout(
  kind: "business" | "vault50" | "vault100" | "vault250",
  workspaceId?: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Please sign in again.", url: null };

  const { workspace } = await getCurrentWorkspace();
  const targetId = workspaceId ?? workspace?.id;
  if (!targetId) return { error: "Choose a LOKR first.", url: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${url}/functions/v1/create-checkout-mylokr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind, workspace_id: targetId }),
  });
  const payload = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !payload.url) {
    return { error: payload.error ?? "Checkout is not ready yet.", url: null };
  }
  return { error: null, url: payload.url };
}
