"use client";

import { usePathname } from "next/navigation";
import { LokrFooter } from "@/components/LokrFooter";
import { cn } from "@/lib/utils";

export function InboxColumns({
  list,
  children,
}: {
  list: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const listOnly = pathname === "/inbox";
  const composeOnly = pathname === "/inbox/new";

  return (
    <div className="flex min-h-0 w-full flex-1">
      <aside
        className={cn(
          "w-full overflow-y-auto border-border bg-card md:max-w-md md:border-r",
          !listOnly && "hidden md:block",
          composeOnly && "hidden",
        )}
      >
        <h2 className="border-b border-border px-4 py-3 text-lg font-semibold">
          Inbox
        </h2>
        {list}
        <LokrFooter />
      </aside>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          listOnly && !composeOnly && "hidden md:flex",
        )}
      >
        {children}
      </div>
    </div>
  );
}
