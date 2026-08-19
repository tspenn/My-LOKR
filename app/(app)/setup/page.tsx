import { redirect } from "next/navigation";
import { WorkspaceSetupForm } from "./WorkspaceSetupForm";
import { listLockrs } from "@/lib/workspace";
import { FREE_OWNED_LOCKRS } from "@/lib/billing";
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
  if (ownedCount >= FREE_OWNED_LOCKRS) redirect("/lockrs");

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set up your LOKR</CardTitle>
          <CardDescription>
            One private locker: you plus 3 invitees, 1 GB, text, and
            attachments. Load a logo, or we will use four letters (FAM, TSTP). A
            4th invitee is when Business starts — only for this locker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSetupForm />
        </CardContent>
      </Card>
    </main>
  );
}
