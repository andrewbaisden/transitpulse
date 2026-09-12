import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

export interface PredictionEvaluation {
  actualGoodServicePercent: number;
  errorPoints: number;
}

/**
 * Once a prediction's target window has actually passed, compare what was
 * predicted against what really happened (`actual`, computed the same way
 * as any other reliability figure — ADR-019). `errorPoints` is the plain
 * absolute difference — no attempt to dress it up as a fancier accuracy
 * metric than the single number it is.
 */
export function evaluatePrediction(
  predictedGoodServicePercent: number,
  actual: ReliabilityResult,
): PredictionEvaluation {
  const errorPoints =
    Math.round(Math.abs(actual.goodServicePercent - predictedGoodServicePercent) * 10) / 10;

  return {
    actualGoodServicePercent: actual.goodServicePercent,
    errorPoints,
  };
}
