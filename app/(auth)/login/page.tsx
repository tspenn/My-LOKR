import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sample?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/inbox";

  return (
    <LoginForm
      nextPath={nextPath}
      errorCode={params.error}
      sample={params.sample === "1"}
    />
  );
}
