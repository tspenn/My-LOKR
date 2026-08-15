"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/files";
import { PLANS, type AccountType, type PlanKey } from "@/lib/billing";
import {
  getCurrentWorkspace,
  listLockrs,
  MAX_LOCKRS,
  writeWorkspaceCookie,
} from "@/lib/workspace";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "personal") as AccountType;
  if (!name) return { error: "Please name this Lokr." };

  const { lockrs } = await listLockrs();
  if (lockrs.length >= MAX_LOCKRS) {
    return { error: `You can keep up to ${MAX_LOCKRS} separate Lockrs on this account.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_create_workspace", {
    p_name: name,
    p_account_type: accountType === "business" ? "business" : "personal",
  });
  if (error || !data) {
    return { error: error?.message ?? "We could not set up your Lokr." };
  }

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const path = `${data}/${crypto.randomUUID()}-${sanitizeFileName(logo.name)}`;
    const { error: uploadError } = await supabase.storage.from("lokr-logos").upload(path, logo, {
      contentType: logo.type || "image/png",
      upsert: true,
    });
    if (!uploadError) {
      await supabase.from("lokr_workspaces").update({ logo_path: path }).eq("id", data);
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
  if (!workspace) return { error: "Set up your Lokr first." };
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

  const { error } = await supabase
    .from("lokr_workspaces")
    .update({ logo_path: path })
    .eq("id", workspace.id);
  if (error) return { error: "We could not save that logo." };

  revalidatePath("/inbox");
  revalidatePath("/profile");
  return { error: null, message: "Logo saved." };
}

export async function inviteWorkspaceMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter the person’s email." };

  const { workspace, memberCount } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your Lokr first." };

  const maxUsers = PLANS[workspace.plan as PlanKey].maxUsers;
  if (maxUsers && memberCount >= maxUsers) {
    return {
      error: `This plan allows ${maxUsers} people. Upgrade to add more.`,
    };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile) {
    return { error: "No one with that email has a Lokr account yet." };
  }

  const { error } = await supabase.from("lokr_workspace_members").insert({
    workspace_id: workspace.id,
    user_id: profile.id,
    role: "member",
  });
  if (error) {
    if (error.message.includes("at most 4")) {
      return { error: "That person already belongs to 4 Lockrs." };
    }
    return { error: "That person is already in this Lokr." };
  }

  revalidatePath("/profile");
  revalidatePath("/inbox/new");
  return { error: null, message: "They can now write in this Lokr." };
}

export async function startCheckout(kind: "business" | "vault50" | "vault100" | "vault250") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Please sign in again.", url: null };

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { error: "Choose a Lokr first.", url: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${url}/functions/v1/create-checkout-mylokr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind, workspace_id: workspace.id }),
  });
  const payload = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !payload.url) {
    return { error: payload.error ?? "Checkout is not ready yet.", url: null };
  }
  return { error: null, url: payload.url };
}
