import { redirect } from "next/navigation";
import { WorkspaceSetupForm } from "./WorkspaceSetupForm";
import { listLockrs, MAX_LOCKRS } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Set up your Lokr" };

export default async function SetupPage() {
  const { lockrs } = await listLockrs();
  if (lockrs.length >= MAX_LOCKRS) redirect("/lockrs");

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{lockrs.length === 0 ? "Set up your Lokr" : "Create another Lokr"}</CardTitle>
          <CardDescription>
            Choose Private or Business, then load a logo. That mark is how you
            tell this space apart from your others. People invited here cannot
            see your other Lockrs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSetupForm />
        </CardContent>
      </Card>
    </main>
  );
}
