import { cookies } from "next/headers";
import {
  PLANS,
  storageLimitBytes,
  usagePercent,
  usageWarning,
  type AccountType,
  type PlanKey,
  type Workspace,
} from "@/lib/billing";
import { lokrMark } from "@/lib/lokr-mark";
import { createClient } from "@/lib/supabase/server";

export const WORKSPACE_COOKIE = "lokr_workspace_id";

export type LokrTile = {
  id: string;
  name: string;
  account_type: AccountType;
  plan: PlanKey;
  logoUrl: string | null;
  mark: string;
  owned: boolean;
  invited: boolean;
};

const WORKSPACE_COLUMNS =
  "id, name, account_type, logo_path, created_by, plan, vault_addon, storage_used_bytes, stripe_customer_id, stripe_subscription_id, vault_subscription_id, created_at";

export async function readWorkspaceCookie() {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function writeWorkspaceCookie(workspaceId: string) {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearWorkspaceCookie() {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, "", { path: "/", maxAge: 0 });
}

async function signedLogoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logoPath: string | null,
) {
  if (!logoPath) return null;
  const { data: signed } = await supabase.storage.from("lokr-logos").createSignedUrl(logoPath, 3600);
  return signed?.signedUrl ?? null;
}

export async function listLockrs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    return { userId: null as string | null, lockrs: [] as LokrTile[], ownedCount: 0 };
  }

  const { data: memberships } = await supabase
    .from("lokr_workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  const ids = (memberships ?? []).map((row) => row.workspace_id);
  if (ids.length === 0) {
    return { userId, lockrs: [] as LokrTile[], ownedCount: 0 };
  }

  const { data: workspaces } = await supabase
    .from("lokr_workspaces")
    .select("id, name, account_type, logo_path, created_by, plan, created_at")
    .in("id", ids);

  const rows = workspaces ?? [];
  const owned = rows.filter((row) => row.created_by === userId);

  const lockrs: LokrTile[] = await Promise.all(
    rows.map(async (row) => {
      const isOwned = row.created_by === userId;
      return {
        id: row.id,
        name: row.name,
        account_type: row.account_type as AccountType,
        plan: (row.plan as PlanKey) ?? "free",
        logoUrl: await signedLogoUrl(supabase, row.logo_path),
        mark: lokrMark(row.name),
        owned: isOwned,
        invited: !isOwned,
      };
    }),
  );

  lockrs.sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { userId, lockrs, ownedCount: owned.length };
}

export async function getCurrentWorkspace() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    return {
      userId: null,
      workspace: null as Workspace | null,
      memberCount: 0,
      logoUrl: null as string | null,
      mark: "LOKR",
      lockrCount: 0,
    };
  }

  const { data: memberships } = await supabase
    .from("lokr_workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  const ids = (memberships ?? []).map((row) => row.workspace_id);
  const lockrCount = ids.length;
  if (lockrCount === 0) {
    return {
      userId,
      workspace: null,
      memberCount: 0,
      logoUrl: null,
      mark: "LOKR",
      lockrCount,
    };
  }

  const cookieId = await readWorkspaceCookie();
  const selectedId =
    (cookieId && ids.includes(cookieId) ? cookieId : null) ??
    (lockrCount === 1 ? ids[0] : null);

  if (!selectedId) {
    return {
      userId,
      workspace: null,
      memberCount: 0,
      logoUrl: null,
      mark: "LOKR",
      lockrCount,
    };
  }

  const { data: workspace } = await supabase
    .from("lokr_workspaces")
    .select(WORKSPACE_COLUMNS)
    .eq("id", selectedId)
    .single();

  const { count } = await supabase
    .from("lokr_workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", selectedId);

  return {
    userId,
    workspace: workspace as Workspace | null,
    memberCount: count ?? 0,
    logoUrl: await signedLogoUrl(supabase, workspace?.logo_path ?? null),
    mark: lokrMark(workspace?.name ?? "LOKR"),
    lockrCount,
  };
}

export function workspaceUsage(workspace: Workspace) {
  const limit = storageLimitBytes(workspace.plan, workspace.vault_addon);
  const percent = usagePercent(workspace.storage_used_bytes, limit);
  return {
    limit,
    percent,
    warning: usageWarning(percent),
    maxUsers: PLANS[workspace.plan as PlanKey].maxUsers,
  };
}
