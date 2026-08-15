import { appOrigin, joinUrl } from "@/lib/site";

const JOIN_TICKET_COOKIE = "lokr_join_ticket";

export function newInviteToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export { JOIN_TICKET_COOKIE, appOrigin, joinUrl };
