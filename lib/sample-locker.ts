import { appOrigin } from "@/lib/site";

/**
 * The public sample LOKR — a real locker filled only with fake data.
 * newapps@skylandreach.com may send unlimited shares into this locker.
 */
export const SAMPLE_LOCKER_EMAIL = (
  process.env.NEXT_PUBLIC_LOKR_SAMPLE_EMAIL ?? "newapps@skylandreach.com"
)
  .trim()
  .toLowerCase();

export const SHARE_PATH = "/share";

export const SAMPLE_LOCKER_COPY = {
  badge: "Shares",
  banner:
    "This is a real LOKR with fake info. Share it — do not invite. There is no secret here.",
  loginTitle: "Open the shared LOKR",
  loginLead:
    "Create your own account, then you land in this real locker. Look around, send messages, and try the app. Do not put anything secret here.",
  people:
    "This locker uses shares, not invites. No seat cap. People who open the share link join this locker only — not anyone’s private LOKR.",
  shareTitle: "Shares",
  shareLead:
    "Copy this share link. Anyone who opens it signs up with their own email and starts using this locker. That is a share, not an invite, and it does not use a private seat.",
} as const;

export function isSampleLockerEmail(email: string | null | undefined) {
  if (!SAMPLE_LOCKER_EMAIL) return false;
  return (email ?? "").trim().toLowerCase() === SAMPLE_LOCKER_EMAIL;
}

export function sharePath() {
  return SHARE_PATH;
}

export function shareUrl() {
  return `${appOrigin()}${SHARE_PATH}`;
}

export function isSharePath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  return (
    next === SHARE_PATH ||
    next.startsWith(`${SHARE_PATH}/`) ||
    next === "/demo" ||
    next.startsWith("/demo/")
  );
}
