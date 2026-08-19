import { redirect } from "next/navigation";
import { WorkspaceSetupForm } from "./WorkspaceSetupForm";
import { listLockrs } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Set up your LOKR" };

export default async function SetupPage() {
  const { ownedCount } = await listLockrs();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{ownedCount === 0 ? "Set up your LOKR" : "Create another LOKR"}</CardTitle>
          <CardDescription>
            Each group is free with up to 3 invitees (you plus 3). Load a logo, or
            we will use four letters (FAM, TSTP). A 4th invitee in this group is
            when Business starts — only for this group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSetupForm />
        </CardContent>
      </Card>
    </main>
  );
}
