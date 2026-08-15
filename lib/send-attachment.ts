import { createClient } from "@/lib/supabase/client";
import { createMessagePlaceholder } from "@/lib/actions/messages";
import { sanitizeFileName } from "@/lib/files";

export async function sendFileToConversation({
  workspaceId,
  conversationId,
  file,
  body,
}: {
  workspaceId: string;
  conversationId: string;
  file: File;
  body: string;
}) {
  const created = await createMessagePlaceholder(conversationId, body, file.size);
  if (created.error || !created.messageId) {
    return { error: created.error ?? "We could not send that video." };
  }

  const supabase = createClient();
  const path = `${workspaceId}/${conversationId}/${created.messageId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("lokr-attachments").upload(path, file, {
    contentType: file.type || "video/webm",
    upsert: false,
  });
  if (uploadError) {
    return { error: "The note was sent, but the video could not be attached." };
  }

  const { error: rowError } = await supabase.from("lokr_message_attachments").insert({
    message_id: created.messageId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || "video/webm",
    size_bytes: file.size,
  });
  if (rowError) {
    return { error: "The note was sent, but the video could not be attached." };
  }

  return { error: null };
}
