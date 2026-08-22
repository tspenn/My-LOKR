import { redirect } from "next/navigation";

/** Old tour links land on the sample locker sign-in. */
export default function DemoTokenRedirect() {
  redirect("/demo");
}
