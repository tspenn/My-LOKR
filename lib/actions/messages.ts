"use server";

import { revalidatePath } from "next/cache";
import { SIGNED_URL_SECONDS } from "@/lib/files";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function sendTextMessage(conversationId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { error: "Please write a message.", messageId: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again.", messageId: null };
  }

  const { data, error } = await supabase
    .from("lokr_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "We could not send that message.", messageId: null };
  }

  revalidatePath(`/conversation/${conversationId}`);
  revalidatePath("/inbox");
  return { error: null, messageId: data.id };
}

export async function createMessagePlaceholder(
  conversationId: string,
  body: string,
  extraBytes = 0,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again.", messageId: null };
  }

  if (extraBytes > 0) {
    const { workspace } = await getCurrentWorkspace();
    if (!workspace) {
      return { error: "Choose a LOKR first.", messageId: null };
    }
    const { data: allowed } = await supabase.rpc("lokr_can_upload", {
      p_additional_bytes: extraBytes,
      p_workspace_id: workspace.id,
    });
    if (!allowed) {
      return {
        error:
          "The Vault is full. Upgrade your plan or add Vault storage to send this file.",
        messageId: null,
      };
    }
  }

  const { data, error } = await supabase
    .from("lokr_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "We could not send that message.", messageId: null };
  }

  return { error: null, messageId: data.id };
}

export async function getAttachmentDownloadUrl(attachmentId: string, expiresIn = SIGNED_URL_SECONDS) {
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("lokr_message_attachments")
    .select("storage_path, file_name")
    .eq("id", attachmentId)
    .single();

  if (error || !attachment) {
    return { error: "That file is not available.", url: null, fileName: null };
  }

  const { data, error: signedError } = await supabase.storage
    .from("lokr-attachments")
    .createSignedUrl(attachment.storage_path, expiresIn);

  if (signedError || !data?.signedUrl) {
    return { error: "We could not prepare that download.", url: null, fileName: null };
  }

  return { error: null, url: data.signedUrl, fileName: attachment.file_name };
}
