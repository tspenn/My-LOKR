const JOIN_TICKET_COOKIE = "lokr_join_ticket";

export function newInviteToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export function appOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function joinUrl(token: string) {
  return `${appOrigin()}/join/${token}`;
}

export { JOIN_TICKET_COOKIE };
