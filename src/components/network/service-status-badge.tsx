import { cn } from "@/lib/utils";
import type { ServiceStatusLevel } from "@/server/domain/types";

const STATUS_META: Record<
  ServiceStatusLevel,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  GOOD_SERVICE: {
    label: "Good Service",
    dotClassName: "bg-emerald-500",
    badgeClassName: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  },
  MINOR_DELAYS: {
    label: "Minor Delays",
    dotClassName: "bg-amber-500",
    badgeClassName: "bg-amber-50 text-amber-900 ring-amber-600/15",
  },
  SEVERE_DELAYS: {
    label: "Severe Delays",
    dotClassName: "bg-red-500",
    badgeClassName: "bg-red-50 text-red-800 ring-red-600/15",
  },
  PART_CLOSURE: {
    label: "Part Closure",
    dotClassName: "bg-orange-500",
    badgeClassName: "bg-orange-50 text-orange-900 ring-orange-600/15",
  },
  SUSPENDED: {
    label: "Suspended",
    dotClassName: "bg-red-700",
    badgeClassName: "bg-red-50 text-red-900 ring-red-700/20",
  },
  SPECIAL_SERVICE: {
    label: "Special Service",
    dotClassName: "bg-sky-500",
    badgeClassName: "bg-sky-50 text-sky-900 ring-sky-600/15",
  },
  UNKNOWN: {
    label: "Status Unknown",
    dotClassName: "bg-slate-400",
    badgeClassName: "bg-slate-100 text-slate-700 ring-slate-500/15",
  },
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        meta.badgeClassName,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}
