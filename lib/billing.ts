export const APP_KEY = "my_lokr";

export const GB = 1024 * 1024 * 1024;

export type PlanKey = "free" | "business" | "enterprise";
export type VaultKey = "none" | "50" | "100" | "250";
export type AccountType = "personal" | "business";

export const FREE_INVITEES_PER_GROUP = 3;

export const PLANS = {
  free: {
    key: "free" as const,
    name: "Free",
    priceLabel: "$0",
    priceMonthly: 0,
    maxUsers: 4,
    storageBytes: 1 * GB,
    storageLabel: "1 GB",
    purpose: "Families and small groups",
    description:
      "A locked space for the people and information you actually care about. Messages and files stay under your control — not routed through Google, Microsoft, or the open internet.",
    features: [
      "Dashboard to pick your Lockrs by logo or four letters",
      "As many groups as you need — each is free with up to 3 invitees",
      "Groups others invite you to stay free for you",
      "You plus 3 people per free group (4 total)",
      "A 4th invitee on a group is Business for that group only",
      "1 GB private storage per free group",
      "Text messages and attachments",
      "No ads and no ad trackers",
    ],
    limitations:
      "Each free group stops at 3 invitees. You cannot put 14 people in a Free group. Upgrade that group to Business for 15 seats.",
  },
  business: {
    key: "business" as const,
    name: "Business",
    priceLabel: "$19 / user / month",
    priceMonthly: 19,
    maxUsers: 15,
    storageBytes: 50 * GB,
    storageLabel: "50 GB shared",
    purpose: "Small teams and businesses",
    description:
      "A quiet, secure side channel for important discussions and proprietary information that don’t belong in regular email. Full messaging, attachments, realtime, and admin basics.",
    features: [
      "This group, upgraded past 3 invitees",
      "Up to 15 people in this group, including you",
      "Invitees still do not pay; they count toward this group’s 15",
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
  "The Vault is private cloud storage for important documents and attachments. Files stay inside the same secure system as your messages. Plans include storage; add more when needed.";

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
