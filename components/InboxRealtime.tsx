"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InboxRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lokr_messages" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
