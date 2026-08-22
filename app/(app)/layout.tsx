import { redirect } from "next/navigation";
import { AppHeader, WorkspaceGate } from "@/components/AppHeader";
import { CallProvider } from "@/components/CallProvider";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { data: hasPassword, error: passwordError } = await supabase.rpc(
    "lokr_has_password",
  );
  if (!passwordError && !hasPassword) redirect("/update-password");

  const { workspace, logoUrl, userId, lockrCount, mark } = await getCurrentWorkspace();

  return (
    <div className="flex h-dvh flex-col bg-background">
      <AppHeader workspace={workspace} logoUrl={logoUrl} mark={mark} />
      <WorkspaceGate workspace={workspace} lockrCount={lockrCount}>
        <CallProvider userId={userId ?? data?.claims?.sub ?? ""} workspaceId={workspace?.id ?? null}>
          <div className="flex min-h-0 flex-1">{children}</div>
        </CallProvider>
      </WorkspaceGate>
    </div>
  );
}
