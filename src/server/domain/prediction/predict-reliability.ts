import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

/**
 * Bump whenever the forecasting method below changes — same convention as
 * RELIABILITY_ALGORITHM_VERSION/ANOMALY_ALGORITHM_VERSION. See DECISIONS.md
 * ADR-023.
 */
export const PREDICTION_ALGORITHM_VERSION = 1;

export interface ReliabilityPredictionValue {
  predictedGoodServicePercent: number;
  algorithmVersion: number;
}

/**
 * Baseline persistence: a line's trailing reliability figure (the same
 * ReliabilityResult getLineReliability already computes — ADR-019) IS the
 * prediction for the next equivalent period. This is deliberately the
 * simplest honest forecast method for the data this project actually has —
 * a handful of days of real history is not enough to justify anything more
 * sophisticated (a seasonal/time-of-day model, a trained model) without
 * that sophistication being fake. See DECISIONS.md ADR-023.
 *
 * Returns null when there's no baseline to predict from (never fabricates
 * a forecast from nothing).
 */
export function predictReliability(
  baseline: ReliabilityResult | null,
): ReliabilityPredictionValue | null {
  if (!baseline) return null;

  return {
    predictedGoodServicePercent: baseline.goodServicePercent,
    algorithmVersion: PREDICTION_ALGORITHM_VERSION,
  };
}
