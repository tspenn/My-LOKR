import Link from "next/link";
import { WorkspaceSetupForm } from "./WorkspaceSetupForm";
import { listLockrs } from "@/lib/workspace";
import { FREE_OWNED_LOCKRS } from "@/lib/billing";
import { Button } from "@/components/ui/button";
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
  if (ownedCount >= FREE_OWNED_LOCKRS) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>You already have a LOKR</CardTitle>
            <CardDescription>
              Free is one locker you own. Open it to send messages or invite people.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/lockrs">Your lockers</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

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
