import { redirect } from "next/navigation";
import { AppHeader, WorkspaceGate } from "@/components/AppHeader";
import { CallProvider } from "@/components/CallProvider";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";
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

  const { workspace, logoUrl, userId, lockrCount, mark, sample } =
    await getCurrentWorkspace();

  return (
    <div className="flex h-dvh flex-col bg-background">
      <AppHeader workspace={workspace} logoUrl={logoUrl} mark={mark} sample={sample} />
      {sample ? (
        <p className="border-b border-border bg-card px-4 py-2 text-center text-sm">
          {SAMPLE_LOCKER_COPY.banner}
        </p>
      ) : null}
      <WorkspaceGate workspace={workspace} lockrCount={lockrCount}>
        <CallProvider userId={userId ?? data?.claims?.sub ?? ""} workspaceId={workspace?.id ?? null}>
          <div className="flex min-h-0 flex-1">{children}</div>
        </CallProvider>
      </WorkspaceGate>
    </div>
  );
}
