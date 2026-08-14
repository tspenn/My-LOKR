import { PLANS, storageLimitBytes, usagePercent, usageWarning, type Workspace } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentWorkspace() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { userId: null, workspace: null as Workspace | null, memberCount: 0, logoUrl: null as string | null };

  const { data: membership } = await supabase
    .from("lokr_workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { userId, workspace: null, memberCount: 0, logoUrl: null };
  }

  const { data: workspace } = await supabase
    .from("lokr_workspaces")
    .select(
      "id, name, account_type, logo_path, created_by, plan, vault_addon, storage_used_bytes, stripe_customer_id, stripe_subscription_id, vault_subscription_id",
    )
    .eq("id", membership.workspace_id)
    .single();

  const { count } = await supabase
    .from("lokr_workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id);

  let logoUrl: string | null = null;
  if (workspace?.logo_path) {
    const { data: signed } = await supabase.storage
      .from("lokr-logos")
      .createSignedUrl(workspace.logo_path, 3600);
    logoUrl = signed?.signedUrl ?? null;
  }

  return {
    userId,
    workspace: workspace as Workspace | null,
    memberCount: count ?? 0,
    logoUrl,
  };
}

export function workspaceUsage(workspace: Workspace) {
  const limit = storageLimitBytes(workspace.plan, workspace.vault_addon);
  const percent = usagePercent(workspace.storage_used_bytes, limit);
  return {
    limit,
    percent,
    warning: usageWarning(percent),
    maxUsers: PLANS[workspace.plan].maxUsers,
  };
}
