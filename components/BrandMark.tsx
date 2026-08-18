import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const icon = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";

  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <Lock className={icon} aria-hidden="true" />
      <span className={cn("font-semibold tracking-tight", text)}>LOKR</span>
    </span>
  );
}
