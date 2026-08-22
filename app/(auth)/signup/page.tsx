import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <SignupForm fromDemo={from === "demo"} />;
}
