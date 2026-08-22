import { redirect } from "next/navigation";
import { SHARE_PATH } from "@/lib/sample-locker";

export const metadata = {
  title: "Shared LOKR",
  description: "A real LOKR filled with fake data.",
  robots: { index: false, follow: false },
};

export default function DemoRedirectPage() {
  redirect(SHARE_PATH);
}
