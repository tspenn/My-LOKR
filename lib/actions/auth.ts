"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearWorkspaceCookie } from "@/lib/workspace";
import { normalizePhone } from "@/lib/phone";

function appOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });
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
  if (password.length < 8) {
    return { error: "Please choose a password with at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName, display_name: displayName },
      emailRedirectTo: `${appOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Confirmed emails already in this Auth project return 200 with no identities
  // and no confirmation mail (anti-enumeration). Treat that as "sign in instead."
  if (!data.user?.identities?.length) {
    return {
      error: "That email already has an account — sign in.",
    };
  }

  await supabase
    .from("profiles")
    .update({ full_name: displayName, email })
    .eq("id", data.user.id);

  return {
    error: null,
    message:
      "Check your email for a confirmation link. Once you confirm, you can sign in.",
  };
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appOrigin()}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: "We could not send a sign-in link. Please try again." };
  }

  return {
    error: null,
    message: "If that account exists, a sign-in link is on its way to your email.",
  };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appOrigin()}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: "We could not start a password reset. Please try again." };
  }

  return {
    error: null,
    message: "If that account exists, a reset link is on its way to your email.",
  };
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Please choose a password with at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "We could not update your password. Please try the reset link again." };
  }

  redirect("/inbox");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearWorkspaceCookie();
  redirect("/login");
}
