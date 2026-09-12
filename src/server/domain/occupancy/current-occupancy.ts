import type { DomainOccupancy } from "@/server/domain/types";

export const CROWDING_LEVEL_LABELS: Record<number, string> = {
  1: "Very quiet",
  2: "Quiet",
  3: "Fairly busy",
  4: "Busy",
  5: "Very busy",
  6: "Exceptionally busy",
};

export interface CurrentOccupancy {
  level: number;
  label: string;
  timeSlice: string;
  // Literal, not a computed range: this is TfL's static historical
  // "typical for this time" data, never a live measurement. See
  // DECISIONS.md ADR-020 for the non-negotiable rule this satisfies.
  confidence: "typical";
  source: string;
}

const SLICE_MINUTES = 15;

function bucketStart(hhmm: string): string {
  const hours = Number(hhmm.slice(0, 2));
  const minutes = Number(hhmm.slice(2, 4));
  const flooredMinutes = Math.floor(minutes / SLICE_MINUTES) * SLICE_MINUTES;
  return `${String(hours).padStart(2, "0")}${String(flooredMinutes).padStart(2, "0")}`;
}

/**
 * Picks the entry (or entries) covering `nowHHmm` (London-local "HHmm",
 * from `formatLondonTime(now, "HHmm")` — the only caller of that
 * formatter here, per ADR-010's "no new date-fns-tz import" rule; all the
 * timezone conversion already happened before this function runs).
 *
 * TfL's `direction=all` returns separate inbound/outbound entries for the
 * same time slice rather than merging them — this averages them (rounded)
 * into one typical figure rather than picking a direction arbitrarily.
 * `level: 0` entries are excluded first: TfL's live data includes 0
 * despite documenting only a 1-6 scale, and its real meaning isn't
 * documented, so it's treated as "no reading" rather than guessed at
 * (never fabricate). See DECISIONS.md ADR-020.
 *
 * Returns null when nothing real matches — an honest "not available for
 * this time," never a guess from a nearby slice.
 */
export function getCurrentOccupancy(
  entries: DomainOccupancy[],
  nowHHmm: string,
): CurrentOccupancy | null {
  const target = bucketStart(nowHHmm);
  const matches = entries.filter(
    (entry) => entry.timeSlice.split("-")[0] === target && entry.level >= 1,
  );

  if (matches.length === 0) return null;

  const level = Math.round(matches.reduce((sum, entry) => sum + entry.level, 0) / matches.length);

  return {
    level,
    label: CROWDING_LEVEL_LABELS[level] ?? "Unknown",
    timeSlice: matches[0].timeSlice,
    confidence: "typical",
    source: matches[0].source,
  };
}
