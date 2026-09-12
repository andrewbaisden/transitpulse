import type { LineAnomaly } from "@/server/queries/anomaly";

/**
 * Only renders when a real anomaly was detected — no "everything's fine"
 * banner, no placeholder for the no-data case (that's what ReliabilitySummary
 * already covers). See DECISIONS.md ADR-022.
 */
export function AnomalyBanner({ anomaly }: { anomaly: LineAnomaly | null }) {
  if (!anomaly) return null;

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Unusual reliability</p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{anomaly.explanation}</p>
    </div>
  );
}
