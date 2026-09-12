import type { ServiceStatusLevel } from "@/server/domain/types";

/**
 * Bump this whenever the formula below changes, per AGENTS.md's rule that
 * reliability algorithm changes need tests + a DECISIONS.md entry (see
 * ADR-019) — this is how a caller can tell which formula produced a given
 * result.
 */
export const RELIABILITY_ALGORITHM_VERSION = 1;

export interface StatusObservation {
  status: ServiceStatusLevel;
  recordedAt: Date;
}

export interface ReliabilityResult {
  goodServicePercent: number;
  coverageStart: Date;
  coverageEnd: Date;
  algorithmVersion: number;
}

/**
 * Time-weighted % of [windowStart, windowEnd] spent in GOOD_SERVICE, from
 * the real gaps between recorded status transitions (each observation's
 * status holds until the next one, or until windowEnd for the latest).
 *
 * Never extrapolates before the first real observation: coverageStart is
 * clamped to the earliest observation seen, even if that's later than
 * windowStart, so a line with only a few hours of history honestly reports
 * a few hours of coverage rather than a fabricated full-window figure. See
 * DECISIONS.md ADR-019.
 *
 * Returns null when there's no observation at or before windowEnd at all.
 */
export function calculateReliability(
  observations: StatusObservation[],
  windowStart: Date,
  windowEnd: Date,
): ReliabilityResult | null {
  const relevant = observations
    .filter((observation) => observation.recordedAt.getTime() < windowEnd.getTime())
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  if (relevant.length === 0) {
    return null;
  }

  const coverageStartMs = Math.max(windowStart.getTime(), relevant[0].recordedAt.getTime());
  const windowEndMs = windowEnd.getTime();
  if (coverageStartMs >= windowEndMs) {
    return null;
  }

  let goodMs = 0;
  let totalMs = 0;

  for (let i = 0; i < relevant.length; i++) {
    const segmentStartMs = Math.max(relevant[i].recordedAt.getTime(), coverageStartMs);
    const nextRecordedAtMs = relevant[i + 1]?.recordedAt.getTime();
    const segmentEndMs = Math.min(nextRecordedAtMs ?? windowEndMs, windowEndMs);

    if (segmentEndMs <= segmentStartMs) {
      continue;
    }

    const durationMs = segmentEndMs - segmentStartMs;
    totalMs += durationMs;
    if (relevant[i].status === "GOOD_SERVICE") {
      goodMs += durationMs;
    }
  }

  if (totalMs <= 0) {
    return null;
  }

  return {
    goodServicePercent: Math.round((goodMs / totalMs) * 1000) / 10,
    coverageStart: new Date(coverageStartMs),
    coverageEnd: windowEnd,
    algorithmVersion: RELIABILITY_ALGORITHM_VERSION,
  };
}
