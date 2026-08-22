/** Public sandbox locker. Not a private LOKR. Nothing secret belongs here. */
export const DEMO_LOGIN_EMAIL = (
  process.env.NEXT_PUBLIC_LOKR_DEMO_EMAIL ?? "fred@skylandapps.com"
)
  .trim()
  .toLowerCase();

export const DEMO_LOCKER_COPY = {
  badge: "Demo",
  banner:
    "Public demo. Nothing here is secret. Invite anyone. This is not a private locker.",
  loginTitle: "Try the public LOKR",
  loginLead:
    "This is a full copy of the app filled with fake data. Sign in as Fred, look around, send messages, and invite people. Do not put anything secret here.",
  people:
    "This demo locker has no invite cap. Add as many fake people as you want. They see this sandbox only — not anyone’s private LOKR.",
} as const;

export function isDemoEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === DEMO_LOGIN_EMAIL;
}
