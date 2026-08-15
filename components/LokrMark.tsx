export function LokrMark({ letters, size = "lg" }: { letters: string; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={
        size === "lg"
          ? "flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-2xl font-semibold tracking-wide text-primary-foreground"
          : "flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-xl font-semibold tracking-wide text-primary-foreground"
      }
    >
      {letters}
    </span>
  );
}
