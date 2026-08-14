import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-md border border-input bg-card px-3 py-3 text-base shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
