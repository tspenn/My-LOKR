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
  badge: "Sample",
  banner:
    "This is a real LOKR. The messages and people in it are fake. Share it with anyone — this locker is not private.",
  loginTitle: "Open the shared LOKR",
  loginLead:
    "Create your own account, then you land in this real locker. Look around, send messages, and try the app. Do not put anything secret here.",
  people:
    "This sample locker has no invite cap. Share the link — that is a share, not a private invite. People join this locker only, not anyone’s private LOKR.",
  shareTitle: "Share this LOKR",
  shareLead:
    "Copy this link. Anyone who signs up from it opens this locker and starts using the app. It does not use a private seat.",
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
