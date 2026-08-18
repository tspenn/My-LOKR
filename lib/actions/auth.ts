"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearWorkspaceCookie } from "@/lib/workspace";
import { normalizePhone } from "@/lib/phone";
import { appOrigin } from "@/lib/site";
import { callLokrAuth, lokrPasswordError } from "@/lib/lokr-auth";

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
    redirect_to: `${appOrigin()}/auth/callback`,
  });
  if (result.error) return { error: result.error };

  return {
    error: null,
    message:
      result.message ??
      "Check your email for a confirmation link. Once you confirm, you can sign in.",
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
