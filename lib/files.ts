export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 90;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "csv",
];

export function isAllowedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeOk =
    file.type === "" ||
    ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]);
  const extOk = ALLOWED_EXTENSIONS.includes(extension);
  return mimeOk && extOk && file.size > 0 && file.size <= MAX_FILE_BYTES;
}

export function fileValidationMessage(file: File) {
  if (file.size <= 0) return `${file.name} looks empty.`;
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is larger than 20 MB.`;
  }
  if (!isAllowedFile(file)) {
    return `${file.name} is not an allowed file type.`;
  }
  return null;
}

export function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 120) || "file";
}
