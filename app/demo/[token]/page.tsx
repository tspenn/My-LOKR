import { redirect } from "next/navigation";
import { SHARE_PATH } from "@/lib/sample-locker";

/** Old links open the real shared locker, not a tour. */
export default function DemoTokenRedirect() {
  redirect(SHARE_PATH);
}
