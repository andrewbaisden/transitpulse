import { LineBadge } from "@/components/network/line-badge";
import { formatCountdown, formatLondonTime } from "@/lib/time";
import type { ArrivalBoard as ArrivalBoardData } from "@/server/queries/arrivals";

/**
 * Rendered once, server-side, from a single page-load snapshot — not
 * client-polled. The "as of HH:mm:ss" timestamp says so explicitly rather
 * than implying a live-ticking board, and `source` is shown so demo data
 * is never mistaken for a real observation (AGENTS.md: never fabricate/
 * never silently blend simulated-or-demo data with live data).
 */
export function ArrivalBoard({ board }: { board: ArrivalBoardData }) {
  if (board.unavailable) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Arrivals aren't available for this station right now.
      </div>
    );
  }

  if (board.rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No upcoming arrivals reported for this station.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm">
        {board.rows.map((row) => (
          // No stable id on a live prediction — line + destination +
          // expectedArrival is unique enough within one page-load snapshot.
          <li
            key={`${row.lineId ?? row.lineName}-${row.destinationName}-${row.expectedArrival.toISOString()}`}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <LineBadge name={row.lineName} color={row.lineColor} />
              <span className="truncate text-sm">{row.destinationName}</span>
            </div>
            <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
              {formatCountdown(row.expectedArrival)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        As of {formatLondonTime(board.fetchedAt, "HH:mm:ss")} · Source: {board.source}
      </p>
    </div>
  );
}
