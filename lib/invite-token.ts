import { appOrigin, joinUrl } from "@/lib/site";

const JOIN_TICKET_COOKIE = "lokr_join_ticket";
const JOIN_EMAIL_COOKIE = "lokr_join_email";

export function newInviteToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export function joinTokenFromPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  const match = next.match(/^\/join\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export { JOIN_TICKET_COOKIE, JOIN_EMAIL_COOKIE, appOrigin, joinUrl };
