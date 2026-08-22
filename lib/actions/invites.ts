"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayNameFrom } from "@/lib/profile";
import { getCurrentWorkspace, writeWorkspaceCookie } from "@/lib/workspace";
import {
  JOIN_EMAIL_COOKIE,
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
  email_hint?: string;
  kind?: "phone" | "email";
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
  store.set(JOIN_EMAIL_COOKIE, "", { path: "/", maxAge: 0 });
}

async function setJoinEmailCookie(email: string) {
  const store = await cookies();
  store.set(JOIN_EMAIL_COOKIE, email, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readJoinTicket() {
  const store = await cookies();
  return store.get(JOIN_TICKET_COOKIE)?.value ?? null;
}

export async function peekInvite(token: string) {
  const supabase = await createClient();
  const phone = await supabase.rpc("lokr_peek_phone_invite", { p_token: token });
  const phoneBag = phone.data as RpcBag | null;
  if (!phone.error && phoneBag?.ok) {
    return { ...phoneBag, kind: "phone" as const };
  }
  const email = await supabase.rpc("lokr_peek_email_invite", { p_token: token });
  const emailBag = email.data as RpcBag | null;
  if (!email.error && emailBag?.ok) {
    return { ...emailBag, kind: "email" as const };
  }
  return { ok: false as const, expired: phoneBag?.expired || emailBag?.expired, used: phoneBag?.used || emailBag?.used };
}

export async function createPhoneInvite(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter the phone number to invite.", notice: null };

  const { workspace } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your LOKR first.", notice: null };

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

export async function createEmailInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter the email to invite.", notice: null };
  }

  const { workspace, sample } = await getCurrentWorkspace();
  if (!workspace) return { error: "Set up your LOKR first.", notice: null };
  if (sample) return { error: "This locker uses shares, not invites.", notice: null };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle()
    : { data: null };
  const inviterName = displayNameFrom(profile ?? {});

  const token = newInviteToken();
  const { data, error } = await supabase.rpc("lokr_create_email_invite", {
    p_workspace_id: workspace.id,
    p_email: email,
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

export async function confirmInviteEmail(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter the email this invite was sent to." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lokr_confirm_invite_email", {
    p_token: token,
    p_email: email,
  });
  const result = data as RpcBag | null;
  if (error || !result?.ok) {
    return {
      error: result?.error ?? "That is not the email this invite was sent to.",
    };
  }
  await setJoinEmailCookie(email);
  return { error: null, wait: Boolean(result.wait) };
}

export async function verifyInviteCode(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const otp = String(formData.get("otp") ?? "");
  const supabase = await createClient();
  const phone = await supabase.rpc("lokr_verify_invite_otp", {
    p_token: token,
    p_otp: otp,
  });
  let result = phone.data as RpcBag | null;
  if (phone.error || !result?.ok || !result.ticket) {
    const email = await supabase.rpc("lokr_verify_email_invite_otp", {
      p_token: token,
      p_otp: otp,
    });
    result = email.data as RpcBag | null;
    if (email.error || !result?.ok || !result.ticket) {
      return {
        error:
          result?.error ??
          "That code did not match. It must be the code sent to the invited email.",
      };
    }
  }
  await setJoinTicketCookie(String(result.ticket));
  return { error: null, confirmed: true };
}

export async function acceptInviteAfterAuth(token?: string | null) {
  const ticket = await readJoinTicket();
  const joinToken = token?.trim() || null;
  if (!ticket && !joinToken) {
    return { error: "Confirm the invited email and code first.", workspaceId: null };
  }

  const supabase = await createClient();
  let result: RpcBag | null = null;
  let errorMessage: string | null = null;

  if (ticket) {
    const phone = await supabase.rpc("lokr_accept_phone_invite", { p_ticket: ticket });
    result = phone.data as RpcBag | null;
    errorMessage = phone.error?.message ?? null;
    if (!result?.ok || !result.workspace_id) {
      const email = await supabase.rpc("lokr_accept_email_invite", { p_ticket: ticket });
      result = email.data as RpcBag | null;
      errorMessage = email.error?.message ?? errorMessage;
    }
  }

  if ((!result?.ok || !result.workspace_id) && joinToken) {
    const phone = await supabase.rpc("lokr_accept_phone_invite_by_token", {
      p_token: joinToken,
    });
    result = phone.data as RpcBag | null;
    errorMessage = phone.error?.message ?? errorMessage;
    if (!result?.ok || !result.workspace_id) {
      const email = await supabase.rpc("lokr_accept_email_invite_by_token", {
        p_token: joinToken,
      });
      result = email.data as RpcBag | null;
      errorMessage = email.error?.message ?? errorMessage;
    }
  }

  if (!result?.ok || !result.workspace_id) {
    return {
      error: errorMessage ?? "This join was not confirmed from the invited email.",
      workspaceId: null,
    };
  }

  await writeWorkspaceCookie(result.workspace_id);
  await clearJoinTicketCookie();
  revalidatePath("/inbox");
  revalidatePath("/inbox/new");
  revalidatePath("/profile");
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
    return { error: "Confirm the invite and the code first, then create your account." };
  }

  if (!displayName || !email || !password) {
    return { error: "Please fill in your name, email, and password." };
  }
  const store = await cookies();
  const invitedEmail = store.get(JOIN_EMAIL_COOKIE)?.value?.trim().toLowerCase();
  if (invitedEmail && email.toLowerCase() !== invitedEmail) {
    return { error: "Create the account with the invited email." };
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
      (invitedEmail
        ? "Check that inbox for the account confirmation link. After you confirm, open LOKR in the app. Messages stay in LOKR — they are not sent by email."
        : "Check your email for a confirmation link. After you confirm, you will land in this LOKR — only because that phone and code were verified."),
  };
}

export async function finishInviteIfSignedIn(formData?: FormData) {
  const token = String(formData?.get("token") ?? "").trim();
  const ticket = await readJoinTicket();
  if (!ticket && !token) {
    return { error: "Confirm the invite and the code first." };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { error: "Sign in after the invite and code are confirmed." };
  }
  const accepted = await acceptInviteAfterAuth(token || null);
  if (accepted.error) return { error: accepted.error };
  redirect("/inbox");
}
