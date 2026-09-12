import type { StationLineOccupancy } from "@/server/queries/occupancy";

const DEFAULT_LINE_COLOR = "#6b7280"; // zinc-500 — matches LineBadge's own fallback

/**
 * One row per line serving the station. Every value is explicitly framed
 * as historical/typical, never as a live measurement — see DECISIONS.md
 * ADR-020 for why (TfL's Crowding data is static, not live).
 */
export function OccupancySummary({ occupancies }: { occupancies: StationLineOccupancy[] }) {
  if (occupancies.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Crowding</h2>
        <p className="mt-1 text-sm text-muted-foreground">Not enough data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Crowding</h2>
      <ul className="flex flex-col gap-2">
        {occupancies.map((line) => (
          <li key={line.lineId} className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: line.lineColor ?? DEFAULT_LINE_COLOR }}
            />
            <span className="min-w-0 flex-1 truncate">{line.lineName}</span>
            {line.occupancy ? (
              <span className="text-right text-sm">
                {line.occupancy.label}
                <span className="block text-xs text-muted-foreground">
                  Typical for this time (TfL historical data)
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
