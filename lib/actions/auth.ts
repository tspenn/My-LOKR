"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { clearWorkspaceCookie } from "@/lib/workspace";
import { normalizePhone } from "@/lib/phone";
import { appOrigin } from "@/lib/site";
import { joinTokenFromPath } from "@/lib/invite-token";
import { callLokrAuth, lokrPasswordError } from "@/lib/lokr-auth";
import { acceptInviteAfterAuth } from "@/lib/actions/invites";

function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/setup";
  }
  if (next.startsWith("/auth/callback")) {
    return "/setup";
  }
  return next;
}

function otpType(raw: string | null | undefined): EmailOtpType {
  if (raw === "recovery" || raw === "signup" || raw === "invite" || raw === "email_change" || raw === "magiclink") {
    return raw;
  }
  return "email";
}

export async function completeEmailAuth(input: {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  next?: string | null;
}): Promise<{ error: string | null; redirectTo: string | null }> {
  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (input.accessToken && input.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    errorMessage = error?.message ?? null;
  } else if (input.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType(input.type),
      token_hash: input.tokenHash,
    });
    errorMessage = error?.message ?? null;
  } else if (input.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(input.code);
    errorMessage = error?.message ?? null;
  } else {
    return { error: "That sign-in link was not valid.", redirectTo: null };
  }

  if (errorMessage) {
    return { error: "That sign-in link was not valid. Please try again.", redirectTo: null };
  }

  await supabase.rpc("lokr_activate_pending_password");
  const { data: hasPassword } = await supabase.rpc("lokr_has_password");
  const accepted = await acceptInviteAfterAuth(joinTokenFromPath(input.next));
  if (accepted.workspaceId) {
    return {
      error: null,
      redirectTo: hasPassword ? "/inbox" : "/update-password",
    };
  }
  if (!hasPassword) {
    return { error: null, redirectTo: "/update-password" };
  }
  return { error: null, redirectTo: safeNextPath(input.next) };
}

export async function signInWithPassword(formData: FormData) {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/lockrs");

  if (!identifier || !password) {
    return { error: "Please enter your email or phone, and your password." };
  }

  const supabase = await createClient();
  let email = identifier;
  if (!identifier.includes("@")) {
    const phone = normalizePhone(identifier);
    if (!phone) {
      return { error: "That email or password did not work. Please try again." };
    }
    const { data: resolved } = await supabase.rpc("lokr_email_for_verified_phone", {
      p_phone_e164: phone,
    });
    if (typeof resolved !== "string" || !resolved.includes("@")) {
      return { error: "That email or password did not work. Please try again." };
    }
    email = resolved;
  }

  const result = await callLokrAuth({ action: "login", email, password });
  if (!result.access_token || !result.refresh_token) {
    return { error: result.error ?? "That email or password did not work. Please try again." };
  }

  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) {
    return { error: "That email or password did not work. Please try again." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const name =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
      null;
    await supabase
      .from("profiles")
      .update({
        email: user.email ?? email,
        ...(name ? { full_name: name } : {}),
      })
      .eq("id", user.id);
  }

  const joinToken = joinTokenFromPath(next);
  if (joinToken) {
    const accepted = await acceptInviteAfterAuth(joinToken);
    if (accepted.workspaceId) {
      redirect("/inbox");
    }
  }

  redirect(next.startsWith("/") ? next : "/lockrs");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password || !displayName) {
    return { error: "Please fill in your name, email, and password." };
  }
  const passwordError = lokrPasswordError(password, confirm);
  if (passwordError) return { error: passwordError };

  const result = await callLokrAuth({
    action: "signup",
    email,
    password,
    full_name: displayName,
    redirect_to: `${appOrigin()}/auth/callback?next=/setup`,
  });
  if (result.error) return { error: result.error };

  return {
    error: null,
    message:
      result.message ??
      "Check your email for a confirmation link. Once you confirm, you will open your free Lokr.",
  };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const result = await callLokrAuth({
    action: "reset",
    email,
    redirect_to: `${appOrigin()}/auth/callback?next=/update-password`,
  });
  if (result.error) {
    return { error: result.error };
  }

  return {
    error: null,
    message:
      result.message ??
      "If that account exists, a reset link is on its way to your email.",
  };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const passwordError = lokrPasswordError(password, confirm);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();
  const { error } = await supabase.rpc("lokr_set_own_password", {
    p_password: password,
  });
  if (error) {
    return { error: "We could not update your LOKR password. Please try the reset link again." };
  }

  redirect("/lockrs");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearWorkspaceCookie();
  redirect("/login");
}
