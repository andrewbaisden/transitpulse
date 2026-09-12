import { describe, expect, it } from "vitest";
import {
  PREDICTION_ALGORITHM_VERSION,
  predictReliability,
} from "@/server/domain/prediction/predict-reliability";
import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

function reliability(percent: number): ReliabilityResult {
  return {
    goodServicePercent: percent,
    coverageStart: new Date("2026-09-01T00:00:00Z"),
    coverageEnd: new Date("2026-09-08T00:00:00Z"),
    algorithmVersion: 1,
  };
}

describe("predictReliability", () => {
  it("returns null when there is no baseline to predict from", () => {
    expect(predictReliability(null)).toBeNull();
  });

  it("uses the baseline's percentage as the prediction (baseline persistence)", () => {
    const result = predictReliability(reliability(92.5));
    expect(result).toEqual({
      predictedGoodServicePercent: 92.5,
      algorithmVersion: PREDICTION_ALGORITHM_VERSION,
    });
  });
});
