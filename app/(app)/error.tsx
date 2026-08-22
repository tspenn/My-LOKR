"use client";

import Link from "next/link";

function isHiddenProductionError(message: string) {
  return (
    message.includes("Minified React error") ||
    message.includes("An error occurred in the Server Components render")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showTechnicalDetail = Boolean(
    error.message && !isHiddenProductionError(error.message),
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        Your messages are still safe. If you just created an account, set up your
        locker and try again.
      </p>
      {showTechnicalDetail ? (
        <p className="max-w-lg text-sm text-muted-foreground">{error.message}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground"
        >
          Try again
        </button>
        <Link
          href="/setup"
          className="rounded-md border border-input bg-card px-5 py-3 font-medium text-foreground"
        >
          Set up locker
        </Link>
        <Link
          href="/lockrs"
          className="rounded-md border border-input bg-card px-5 py-3 font-medium text-foreground"
        >
          Your lockers
        </Link>
      </div>
    </div>
  );
}
