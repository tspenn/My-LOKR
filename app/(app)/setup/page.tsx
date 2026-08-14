import { redirect } from "next/navigation";
import { WorkspaceSetupForm } from "./WorkspaceSetupForm";
import { getCurrentWorkspace } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Set up your Lokr" };

export default async function SetupPage() {
  const { workspace } = await getCurrentWorkspace();
  if (workspace) redirect("/inbox");

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set up your Lokr</CardTitle>
          <CardDescription>
            Choose Private or Business, then load a logo. That mark is what people
            will see when they open this app — LOKR stays small at the bottom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSetupForm />
        </CardContent>
      </Card>
    </main>
  );
}
