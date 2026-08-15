"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayNameFrom } from "@/lib/profile";
import { getCurrentWorkspace, writeWorkspaceCookie } from "@/lib/workspace";
import {
  JOIN_TICKET_COOKIE,
  appOrigin,
  joinUrl,
  newInviteToken,
} from "@/lib/invite-token";
import { inviteNoticeText, normalizePhone } from "@/lib/phone";
import { callLokrAuth, lokrPasswordError } from "@/lib/lokr-auth";

type RpcBag = {
  ok?: boolean;
  id?: string;
  error?: string;
  wait?: boolean;
  ticket?: string;
  workspace_id?: string;
  inviter_name?: string;
  workspace_name?: string;
  phone_last4?: string;
  status?: string;
  expired?: boolean;
  used?: boolean;
};

async function setJoinTicketCookie(ticket: string) {
  const store = await cookies();
  store.set(JOIN_TICKET_COOKIE, ticket, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearJoinTicketCookie() {
  const store = await cookies();
  store.set(JOIN_TICKET_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function readJoinTicket() {
  const store = await cookies();
  return store.get(JOIN_TICKET_COOKIE)?.value ?? null;
}

export async function peekInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_peek_phone_invite", {
    p_token: token,
  });
  if (error || !data) return { ok: false as const };
  return data as RpcBag;
}

export async function createPhoneInvite(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter the phone number to invite.", notice: null };

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your Lokr first.", notice: null };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle()
    : { data: null };
  const inviterName = displayNameFrom(profile ?? {});

  const token = newInviteToken();
  const { data, error } = await supabase.rpc("lokr_create_phone_invite", {
    p_workspace_id: workspace.id,
    p_phone_e164: phone,
    p_token: token,
  });
  const result = data as RpcBag | null;
  if (error || !result?.ok) {
    return {
      error: error?.message ?? "We could not create that invite.",
      notice: null,
    };
  }

  const url = joinUrl(token);
  revalidatePath("/profile");
  revalidatePath("/inbox/new");
  return {
    error: null,
    notice: inviteNoticeText(inviterName, url),
    joinUrl: url,
  };
}

export async function confirmInvitePhone(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) {
    return { error: "Enter the phone number this invite was sent to." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_confirm_invite_phone", {
    p_token: token,
    p_phone_e164: phone,
  });
  const result = data as RpcBag | null;
  if (error || !result?.ok) {
    return {
      error: result?.error ?? "That is not the phone number this invite was sent to.",
    };
  }
  return { error: null, wait: Boolean(result.wait) };
}

export async function verifyInviteCode(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const otp = String(formData.get("otp") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_verify_invite_otp", {
    p_token: token,
    p_otp: otp,
  });
  const result = data as RpcBag | null;
  if (error || !result?.ok || !result.ticket) {
    return {
      error: result?.error ?? "That code did not match. It must be the code sent to the invited phone.",
    };
  }
  await setJoinTicketCookie(String(result.ticket));
  return { error: null, confirmed: true };
}

export async function acceptInviteAfterAuth() {
  const ticket = await readJoinTicket();
  if (!ticket) return { error: "Confirm the invited phone first.", workspaceId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_accept_phone_invite", {
    p_ticket: ticket,
  });
  const result = data as RpcBag | null;
  if (error || !result?.ok || !result.workspace_id) {
    return {
      error: error?.message ?? "This join was not confirmed from the invited phone.",
      workspaceId: null,
    };
  }

  await writeWorkspaceCookie(result.workspace_id);
  await clearJoinTicketCookie();
  revalidatePath("/inbox");
  revalidatePath("/lockrs");
  return { error: null, workspaceId: result.workspace_id };
}

export async function finishInviteJoin(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const token = String(formData.get("token") ?? "");

  const ticket = await readJoinTicket();
  if (!ticket) {
    return { error: "Confirm the invited phone first, then create your account." };
  }

  if (!displayName || !email || !password) {
    return { error: "Please fill in your name, email, and password." };
  }
  const passwordError = lokrPasswordError(password, confirm);
  if (passwordError) return { error: passwordError };

  const result = await callLokrAuth({
    action: "join",
    email,
    password,
    full_name: displayName,
    redirect_to: `${appOrigin()}/auth/callback?next=/join/${encodeURIComponent(token)}`,
  });
  if (result.error) return { error: result.error };

  return {
    error: null,
    message:
      result.message ??
      "Check your email for a confirmation link. After you confirm, you will land in this Lokr — only because this phone was verified.",
  };
}

export async function finishInviteIfSignedIn() {
  const ticket = await readJoinTicket();
  if (!ticket) {
    return { error: "Confirm the invited phone first." };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Sign in after the phone is confirmed." };
  }
  const accepted = await acceptInviteAfterAuth();
  if (accepted.error) return { error: accepted.error };
  redirect("/inbox");
}
