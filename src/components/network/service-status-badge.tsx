import { cn } from "@/lib/utils";
import type { ServiceStatusLevel } from "@/server/domain/types";

const STATUS_META: Record<ServiceStatusLevel, { label: string; dotClassName: string }> = {
  GOOD_SERVICE: { label: "Good Service", dotClassName: "bg-emerald-500" },
  MINOR_DELAYS: { label: "Minor Delays", dotClassName: "bg-amber-500" },
  SEVERE_DELAYS: { label: "Severe Delays", dotClassName: "bg-red-500" },
  PART_CLOSURE: { label: "Part Closure", dotClassName: "bg-orange-500" },
  SUSPENDED: { label: "Suspended", dotClassName: "bg-red-700" },
  SPECIAL_SERVICE: { label: "Special Service", dotClassName: "bg-sky-500" },
  UNKNOWN: { label: "Status Unknown", dotClassName: "bg-zinc-400" },
};

/**
 * Status is always communicated as text, never colour alone — the dot is a
 * secondary visual cue, not the only signal (accessibility requirement).
 */
export function ServiceStatusBadge({
  status,
  className,
}: {
  status: ServiceStatusLevel;
  className?: string;
}) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}
