import { redirect } from "next/navigation";
import { AppHeader, WorkspaceGate } from "@/components/AppHeader";
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

  const { workspace, logoUrl } = await getCurrentWorkspace();

  return (
    <div className="flex h-dvh flex-col bg-[#1F1F1F]">
      <AppHeader workspace={workspace} logoUrl={logoUrl} />
      <WorkspaceGate workspace={workspace}>
        <div className="flex min-h-0 flex-1">{children}</div>
      </WorkspaceGate>
    </div>
  );
}
