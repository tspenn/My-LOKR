"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        Your messages are still safe. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
