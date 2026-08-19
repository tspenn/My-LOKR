"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeEmailAuth } from "@/lib/actions/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirming your email…");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    void completeEmailAuth({
      code: search.get("code"),
      tokenHash: search.get("token_hash"),
      type: search.get("type") ?? hash.get("type"),
      accessToken: hash.get("access_token"),
      refreshToken: hash.get("refresh_token"),
      next: search.get("next") ?? hash.get("next"),
    }).then((result) => {
      if (result.redirectTo) {
        setStatus("Opening LOKR…");
        router.replace(result.redirectTo);
        return;
      }
      router.replace("/login?error=auth");
    });
  }, [router]);

  return (
    <main className="flex min-h-full items-center justify-center px-4 py-16 text-lg">
      {status}
    </main>
  );
}
