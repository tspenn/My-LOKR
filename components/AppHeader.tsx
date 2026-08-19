"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Settings } from "lucide-react";
import { LokrMark } from "@/components/LokrMark";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/billing";

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
        Opening your LOKR…
      </div>
    );
  }

  return children;
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-4 py-2 text-base font-medium",
        active ? "bg-[#C9C2B6] text-[#1F1F1F]" : "text-foreground hover:bg-secondary",
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
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
  const planLabel =
    workspace?.plan === "business"
      ? "Business"
      : workspace?.plan === "enterprise"
        ? "Enterprise"
        : "Free";
  const inboxActive =
    pathname === "/inbox" || pathname.startsWith("/conversation/");
  const composeActive = pathname === "/inbox/new";

  const logo = (
    <Link href="/lockrs" className="rounded-md">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={workspace?.name ?? "Workspace logo"}
          className="h-32 max-w-[32rem] object-contain"
        />
      ) : workspace ? (
        <LokrMark letters={mark} size="xl" />
      ) : (
        <p className="text-4xl font-semibold tracking-tight">LOKR</p>
      )}
    </Link>
  );

  return (
    <header className="border-b border-border bg-background">
      <div className="relative mx-auto max-w-7xl px-4 py-5">
        <div className="absolute right-4 top-5 z-10 flex items-center gap-1">
          {workspace ? (
            <Link
              href="/profile"
              aria-label="Settings"
              title="Settings"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary",
                pathname === "/profile" ? "bg-[#C9C2B6] text-[#1F1F1F]" : "",
              )}
            >
              <Settings className="h-5 w-5" />
            </Link>
          ) : null}
          <SignOutButton compact />
        </div>

        {workspace ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pr-16 sm:gap-8">
            <nav aria-label="Main" className="flex shrink-0">
              <NavLink href="/inbox" label="Inbox" active={inboxActive} />
            </nav>
            <div className="flex min-w-0 flex-col items-center gap-2">
              {logo}
              <span className="rounded-full border border-[#3F3F3F] bg-secondary px-3 py-0.5 text-sm text-[#C9C2B6]">
                {planLabel}
              </span>
              <Link
                href="/lockrs"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Switch LOKR
              </Link>
            </div>
            <nav aria-label="Compose" className="flex shrink-0">
              <NavLink href="/inbox/new" label="New message" active={composeActive} />
            </nav>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pr-16">{logo}</div>
        )}
      </div>
    </header>
  );
}
