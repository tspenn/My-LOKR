import { getSupabaseEnv } from "@/lib/env";

export const LOKR_PASSWORD_MIN = 12;

export function lokrPasswordError(password: string, confirm?: string) {
  if (password.length < LOKR_PASSWORD_MIN) {
    return `Please choose a My Lokr password with at least ${LOKR_PASSWORD_MIN} characters.`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "The two passwords do not match.";
  }
  return null;
}

export type LokrAuthResult = {
  error?: string;
  message?: string;
  ok?: boolean;
  access_token?: string;
  refresh_token?: string;
};

export async function callLokrAuth(body: {
  action: "login" | "signup" | "join" | "reset";
  email: string;
  password?: string;
  full_name?: string;
  redirect_to?: string;
}): Promise<LokrAuthResult> {
  const { url, key } = getSupabaseEnv();
  const res = await fetch(`${url}/functions/v1/auth-mylokr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as LokrAuthResult;
  if (!res.ok) {
    return { error: payload.error ?? "Something went wrong. Please try again." };
  }
  return payload;
}
