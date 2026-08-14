"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) {
    return { error: "Please enter a display name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: displayName })
    .eq("id", user.id);

  if (error) {
    return { error: "We could not update your name. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/inbox");
  return { error: null, message: "Your name has been saved." };
}
