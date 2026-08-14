import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "secondary" }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
