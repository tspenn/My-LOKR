import Link from "next/link";
import { formatFileSize } from "@/lib/utils";
import { usageWarning } from "@/lib/billing";
import { Alert } from "@/components/ui/alert";

export function UsageMeter({
  usedBytes,
  limitBytes,
  compact = false,
}: {
  usedBytes: number;
  limitBytes: number;
  compact?: boolean;
}) {
  const percent = limitBytes <= 0 ? 0 : Math.min(100, (usedBytes / limitBytes) * 100);
  const warning = usageWarning(percent);
  const barColor =
    warning === "full"
      ? "bg-[#C45C5C]"
      : warning === "critical"
        ? "bg-[#C4A46A]"
        : warning === "warn"
          ? "bg-[#C4A46A]"
          : "bg-[#C9C2B6]";

  return (
    <div className="space-y-2">
      {!compact ? (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p className="font-medium">The Vault</p>
          <p className="text-muted-foreground">
            {formatFileSize(usedBytes)} of {formatFileSize(limitBytes)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Storage {Math.round(percent)}% · {formatFileSize(usedBytes)} / {formatFileSize(limitBytes)}
        </p>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label="Private storage used"
      >
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {warning === "warn" ? (
        <Alert>
          You have used 80% of your private storage.{" "}
          <Link href="/pricing" className="font-medium underline-offset-2 hover:underline">
            Add Vault space
          </Link>{" "}
          before you run out.
        </Alert>
      ) : null}
      {warning === "critical" ? (
        <Alert>
          You have used 95% of your private storage. New uploads will stop at the limit.{" "}
          <Link href="/pricing" className="font-medium underline-offset-2 hover:underline">
            Upgrade The Vault
          </Link>
        </Alert>
      ) : null}
      {warning === "full" ? (
        <Alert variant="destructive">
          Storage is full. New files are blocked until you free space or add Vault storage.{" "}
          <Link href="/pricing" className="font-medium underline-offset-2 hover:underline">
            Open plans
          </Link>
        </Alert>
      ) : null}
    </div>
  );
}
