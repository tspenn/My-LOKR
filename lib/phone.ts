/** Normalize a typed phone to E.164. US 10-digit numbers become +1. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let e164: string;
  if (hasPlus) {
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    e164 = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    e164 = `+${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    e164 = `+${digits}`;
  } else {
    return null;
  }

  if (!/^\+[1-9][0-9]{7,14}$/.test(e164)) return null;
  return e164;
}

export function maskPhoneLast4(last4: string) {
  return `ending in ${last4}`;
}

export function formatPhoneForOwner(e164: string) {
  if (e164.startsWith("+1") && e164.length === 12) {
    return `+1 (${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;
  }
  return e164;
}

export function inviteNoticeText(inviterName: string, joinUrl: string) {
  return `My-LOKR.com — ${inviterName} invites you to LOKR Communications\n${joinUrl}`;
}

export function inviteCodeText(code: string) {
  return `Your LOKR code is ${code}. Enter it on the join page. It only works from the phone this invite was sent to.`;
}
