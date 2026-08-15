"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LokrMark } from "@/components/LokrMark";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/billing";

const links = [
  { href: "/inbox", label: "Inbox" },
  { href: "/inbox/new", label: "New message" },
  { href: "/pricing", label: "Plans" },
  { href: "/profile", label: "Settings" },
];

export function WorkspaceGate({
  workspace,
  lockrCount,
  children,
}: {
  workspace: Workspace | null;
  lockrCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const allowedWithoutWorkspace =
      pathname === "/setup" || pathname === "/pricing" || pathname === "/lockrs";
    if (!workspace && !allowedWithoutWorkspace) {
      router.replace(lockrCount > 0 ? "/lockrs" : "/setup");
    }
  }, [workspace, pathname, router, lockrCount]);

  if (
    !workspace &&
    pathname !== "/setup" &&
    pathname !== "/pricing" &&
    pathname !== "/lockrs"
  ) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Opening your Lokr…
      </div>
    );
  }

  return children;
}

export function AppHeader({
  workspace,
  logoUrl,
  mark,
}: {
  workspace: Workspace | null;
  logoUrl: string | null;
  mark: string;
}) {
  const pathname = usePathname();
  const accountLabel =
    workspace?.account_type === "business" ? "Business" : "Private";

  return (
    <header className="border-b border-border bg-[#1F1F1F]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-5">
        <div className="flex w-full flex-col items-center gap-2">
          {logoUrl ? (
            <Link href="/lockrs" className="rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={workspace?.name ?? "Workspace logo"}
                className="h-16 max-w-[16rem] object-contain"
              />
            </Link>
          ) : (
            <Link href="/lockrs" className="rounded-md">
              {workspace ? (
                <LokrMark letters={mark} size="sm" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight">My Lokr</p>
              )}
            </Link>
          )}
          {workspace ? (
            <>
              <span className="rounded-full border border-[#3F3F3F] bg-[#2A2A2A] px-3 py-0.5 text-sm text-[#C9C2B6]">
                {accountLabel}
              </span>
              <Link
                href="/lockrs"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Switch Lokr
              </Link>
            </>
          ) : null}
        </div>
        <nav aria-label="Main" className="flex flex-wrap items-center justify-center gap-2">
          {workspace
            ? links.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href === "/inbox" &&
                    (pathname === "/inbox" || pathname.startsWith("/conversation/")));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-4 py-2 text-base font-medium",
                      active
                        ? "bg-[#C9C2B6] text-[#1F1F1F]"
                        : "text-foreground hover:bg-[#2A2A2A]",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })
            : null}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
