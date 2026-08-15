/** Canonical production site. Apex my-lokr.com 308s here on Vercel. */
export const PRODUCTION_ORIGIN = "https://www.my-lokr.com";
export const PRODUCTION_HOST = "www.my-lokr.com";

export function appOrigin() {
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_ORIGIN;
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercelHost = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelHost) {
    return vercelHost.startsWith("http") ? vercelHost.replace(/\/$/, "") : `https://${vercelHost}`;
  }
  return "http://localhost:3000";
}

export function joinUrl(token: string) {
  return `${appOrigin()}/join/${token}`;
}
