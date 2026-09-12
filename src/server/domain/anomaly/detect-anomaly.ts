import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

/**
 * Bump whenever the thresholds/formula below change — same convention as
 * RELIABILITY_ALGORITHM_VERSION (ADR-019); this is now a second reliability
 * -adjacent algorithm, so AGENTS.md's "tests + a DECISIONS.md entry" rule
 * applies to it too. See DECISIONS.md ADR-022.
 */
export const ANOMALY_ALGORITHM_VERSION = 1;

// A deviation smaller than this is normal day-to-day variation, not an
// anomaly worth surfacing.
const DEVIATION_THRESHOLD_POINTS = 15;
// Don't flag an anomaly from a handful of minutes of recent data — a single
// brief blip isn't "today's reliability is bad", it's noise.
const MIN_RECENT_COVERAGE_MS = 2 * 60 * 60 * 1000;

export interface AnomalyResult {
  recentGoodServicePercent: number;
  baselineGoodServicePercent: number;
  deviationPoints: number; // baseline - recent; positive = worse than usual
  explanation: string;
  algorithmVersion: number;
}

/**
 * Explainable, threshold-based anomaly detection: flags when a line's
 * recent reliability is meaningfully worse than its own rolling baseline.
 * Deliberately not a statistical/ML model — the "explanation" is just the
 * two numbers being compared, which is what "explainable" means here: a
 * reader can see exactly why it fired, not trust a black box.
 *
 * Takes already-computed ReliabilityResult objects (see
 * calculate-reliability.ts) rather than recomputing from raw observations
 * itself — reuses Phase 8's windowing/coverage logic instead of
 * duplicating it. Returns null (never fabricates an anomaly) when either
 * window lacks enough data, or recent coverage is too thin to judge, or
 * the deviation doesn't clear the threshold.
 */
export function detectAnomaly(
  recent: ReliabilityResult | null,
  baseline: ReliabilityResult | null,
): AnomalyResult | null {
  if (!recent || !baseline) return null;

  const recentCoverageMs = recent.coverageEnd.getTime() - recent.coverageStart.getTime();
  if (recentCoverageMs < MIN_RECENT_COVERAGE_MS) return null;

  const deviationPoints =
    Math.round((baseline.goodServicePercent - recent.goodServicePercent) * 10) / 10;
  if (deviationPoints < DEVIATION_THRESHOLD_POINTS) return null;

  return {
    recentGoodServicePercent: recent.goodServicePercent,
    baselineGoodServicePercent: baseline.goodServicePercent,
    deviationPoints,
    explanation: `Reliability in the last day (${recent.goodServicePercent}% good service) is ${deviationPoints} points below its typical baseline (${baseline.goodServicePercent}% over the past week).`,
    algorithmVersion: ANOMALY_ALGORITHM_VERSION,
  };
}
