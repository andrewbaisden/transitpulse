import { formatLondonDateTime } from "@/lib/time";
import type { LineReliability } from "@/server/queries/reliability";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// How close coverage has to be to the full requested window before we call
// it "last N days" instead of disclosing the shorter real coverage period.
const FULL_WINDOW_TOLERANCE_MS = HOUR_MS;

function describeCoverage(reliability: LineReliability): string {
  const coverageMs = reliability.coverageEnd.getTime() - reliability.coverageStart.getTime();
  const fullWindowMs = reliability.windowDays * DAY_MS;

  if (fullWindowMs - coverageMs <= FULL_WINDOW_TOLERANCE_MS) {
    return `Last ${reliability.windowDays} days`;
  }

  if (coverageMs < DAY_MS) {
    const hours = Math.max(1, Math.round(coverageMs / HOUR_MS));
    return `Based on ${hours} hour${hours === 1 ? "" : "s"} of data since ${formatLondonDateTime(reliability.coverageStart)}`;
  }

  const days = Math.round((coverageMs / DAY_MS) * 10) / 10;
  return `Based on ${days} day${days === 1 ? "" : "s"} of data since ${formatLondonDateTime(reliability.coverageStart)}`;
}

/**
 * Never fabricates a full-window figure when only partial history has been
 * collected — see DECISIONS.md ADR-019. A separate component (not inline
 * in the line detail page) so this branching display logic is
 * unit-testable without a database.
 */
export function ReliabilitySummary({ reliability }: { reliability: LineReliability | null }) {
  if (!reliability) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">Reliability</h2>
        <p className="mt-1 text-sm text-muted-foreground">Not enough data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Reliability</h2>
      <p className="mt-1 text-2xl font-bold tracking-tight">
        {reliability.goodServicePercent}%{" "}
        <span className="text-base font-normal">good service</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{describeCoverage(reliability)}</p>
    </div>
  );
}
