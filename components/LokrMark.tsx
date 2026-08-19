export function LokrMark({ letters, size = "lg" }: { letters: string; size?: "sm" | "lg" | "xl" }) {
  const sizeClass =
    size === "xl"
      ? "flex h-32 w-32 items-center justify-center rounded-xl bg-primary text-4xl font-semibold tracking-wide text-primary-foreground"
      : size === "lg"
        ? "flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-2xl font-semibold tracking-wide text-primary-foreground"
        : "flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-xl font-semibold tracking-wide text-primary-foreground";

  return (
    <span aria-hidden="true" className={sizeClass}>
      {letters}
    </span>
  );
}
