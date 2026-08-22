import { redirect } from "next/navigation";

/** Old tour links land on the full Fred demo sign-in. */
export default function DemoTokenRedirect() {
  redirect("/demo");
}
