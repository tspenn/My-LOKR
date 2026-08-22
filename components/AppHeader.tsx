"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Settings } from "lucide-react";
import { LokrMark } from "@/components/LokrMark";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/billing";
import { SAMPLE_LOCKER_COPY } from "@/lib/sample-locker";

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
      pathname === "/setup" ||
      pathname === "/pricing" ||
      pathname === "/lockrs" ||
      pathname === "/inbox";
    if (!workspace && !allowedWithoutWorkspace) {
      router.replace(lockrCount > 0 ? "/lockrs" : "/inbox");
    }
  }, [workspace, pathname, router, lockrCount]);

  if (
    !workspace &&
    pathname !== "/setup" &&
    pathname !== "/pricing" &&
    pathname !== "/lockrs" &&
    pathname !== "/inbox"
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
  sample = false,
}: {
  workspace: Workspace | null;
  logoUrl: string | null;
  mark: string;
  sample?: boolean;
}) {
  const pathname = usePathname();
  const planLabel = sample
    ? SAMPLE_LOCKER_COPY.badge
    : workspace?.plan === "business"
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
          className="h-24 max-w-[10rem] object-contain"
        />
      ) : workspace ? (
        <LokrMark letters={mark} size="lg" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight">LOKR</p>
      )}
    </Link>
  );

  const accountControls = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {workspace ? (
        <>
          <span className="rounded-full border border-[#3F3F3F] bg-secondary px-3 py-0.5 text-sm text-[#C9C2B6]">
            {planLabel}
          </span>
          <Link
            href="/lockrs"
            className="whitespace-nowrap px-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Switch LOKR
          </Link>
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
        </>
      ) : null}
      <SignOutButton compact />
    </div>
  );

  return (
    <header className="border-b border-border bg-background">
      <div className="relative px-4 py-4">
        <div className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 md:block">
          {accountControls}
        </div>
        {workspace ? (
          <>
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 sm:gap-4">
                <nav aria-label="Main">
                  <NavLink href="/inbox" label="Inbox" active={inboxActive} />
                </nav>
                {logo}
                <nav aria-label="Compose">
                  <NavLink href="/inbox/new" label="New message" active={composeActive} />
                </nav>
              </div>
            </div>
            <div className="mt-3 flex justify-center md:hidden">{accountControls}</div>
          </>
        ) : (
          <>
            <div className="flex justify-center">{logo}</div>
            <div className="mt-3 flex justify-center md:hidden">{accountControls}</div>
          </>
        )}
      </div>
    </header>
  );
}
