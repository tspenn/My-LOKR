/**
 * The public sample LOKR — a real locker filled only with fake data.
 * Leave the email empty until there is an inbox nobody else should know.
 */
export const SAMPLE_LOCKER_EMAIL = (
  process.env.NEXT_PUBLIC_LOKR_SAMPLE_EMAIL ?? ""
)
  .trim()
  .toLowerCase();

export const SAMPLE_LOCKER_COPY = {
  badge: "Sample",
  banner:
    "This is a real LOKR. The messages and people in it are fake. Invite anyone — this locker is not private.",
  loginTitle: "Open the sample LOKR",
  loginLead:
    "Sign in to a real locker filled with fake data. Look around, send messages, and invite people. Do not put anything secret here.",
  people:
    "This sample locker has no invite cap. Add as many people as you want. They join this locker only — not anyone’s private LOKR.",
} as const;

export function isSampleLockerEmail(email: string | null | undefined) {
  if (!SAMPLE_LOCKER_EMAIL) return false;
  return (email ?? "").trim().toLowerCase() === SAMPLE_LOCKER_EMAIL;
}
