export const APP_KEY = "my_lokr";

export const GB = 1024 * 1024 * 1024;

export type PlanKey = "free" | "business" | "enterprise";
export type VaultKey = "none" | "50" | "100" | "250";
export type AccountType = "personal" | "business";

export const PLANS = {
  free: {
    key: "free" as const,
    name: "Free",
    priceLabel: "$0",
    priceMonthly: 0,
    maxUsers: 4,
    storageBytes: 1 * GB,
    storageLabel: "1 GB",
    purpose: "Personal use and testing only",
    description:
      "A locked space for a handful of people. Enough to try My Lokr. Not for real proprietary business work.",
    features: [
      "Up to 4 people",
      "1 GB private storage",
      "Text messages and attachments",
      "No ads",
    ],
    limitations: "Basic features only. Upgrade when you hit the people or storage limit.",
  },
  business: {
    key: "business" as const,
    name: "Business",
    priceLabel: "$19 / user / month",
    priceMonthly: 19,
    maxUsers: 15,
    storageBytes: 50 * GB,
    storageLabel: "50 GB shared",
    purpose: "Small teams who want privacy for proprietary work",
    description:
      "A secure side channel for the work that should not travel through Microsoft or Google mail. Full messaging, attachments, realtime, and admin basics.",
    features: [
      "Up to 15 people",
      "50 GB shared private storage",
      "Full messaging and attachments",
      "Realtime updates",
      "Admin basics",
      "No ads",
    ],
    limitations: null,
  },
  enterprise: {
    key: "enterprise" as const,
    name: "Enterprise",
    priceLabel: "Custom",
    priceMonthly: null,
    maxUsers: null,
    storageBytes: 1024 * GB,
    storageLabel: "Negotiated",
    purpose: "Larger or highly sensitive organizations",
    description:
      "Handled one company at a time. Users, storage, and terms are set with you. No public price list.",
    features: [
      "Custom user count",
      "Custom storage",
      "Direct onboarding",
      "No ads",
    ],
    limitations: "Contact us. There is no self-serve checkout.",
  },
} as const;

export const VAULT_ADDONS = {
  none: { key: "none" as const, name: "None", gb: 0, priceMonthly: 0, bytes: 0 },
  "50": {
    key: "50" as const,
    name: "The Vault +50 GB",
    gb: 50,
    priceMonthly: 7,
    bytes: 50 * GB,
  },
  "100": {
    key: "100" as const,
    name: "The Vault +100 GB",
    gb: 100,
    priceMonthly: 12,
    bytes: 100 * GB,
  },
  "250": {
    key: "250" as const,
    name: "The Vault +250 GB",
    gb: 250,
    priceMonthly: 25,
    bytes: 250 * GB,
  },
} as const;

export const VAULT_DESCRIPTION =
  "The Vault is extra private storage on top of your plan. Anyone on Free, Business, or Enterprise can add it. Files stay in a locked Supabase bucket and never leave My Lokr.";

export function storageLimitBytes(plan: PlanKey, vault: VaultKey) {
  return PLANS[plan].storageBytes + VAULT_ADDONS[vault].bytes;
}

export function usagePercent(usedBytes: number, limitBytes: number) {
  if (limitBytes <= 0) return 0;
  return Math.min(100, Math.round((usedBytes / limitBytes) * 1000) / 10);
}

export function usageWarning(percent: number) {
  if (percent >= 100) return "full" as const;
  if (percent >= 95) return "critical" as const;
  if (percent >= 80) return "warn" as const;
  return "ok" as const;
}

export type Workspace = {
  id: string;
  name: string;
  account_type: AccountType;
  logo_path: string | null;
  created_by: string;
  plan: PlanKey;
  vault_addon: VaultKey;
  storage_used_bytes: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  vault_subscription_id: string | null;
};
