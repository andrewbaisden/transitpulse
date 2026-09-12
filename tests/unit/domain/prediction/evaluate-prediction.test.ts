import { describe, expect, it } from "vitest";
import { evaluatePrediction } from "@/server/domain/prediction/evaluate-prediction";
import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

function reliability(percent: number): ReliabilityResult {
  return {
    goodServicePercent: percent,
    coverageStart: new Date("2026-09-01T00:00:00Z"),
    coverageEnd: new Date("2026-09-02T00:00:00Z"),
    algorithmVersion: 1,
  };
}

describe("evaluatePrediction", () => {
  it("computes the plain absolute error between predicted and actual", () => {
    const result = evaluatePrediction(90, reliability(82));
    expect(result).toEqual({ actualGoodServicePercent: 82, errorPoints: 8 });
  });

  it("returns zero error for a perfect prediction", () => {
    const result = evaluatePrediction(95, reliability(95));
    expect(result.errorPoints).toBe(0);
  });

  it("is symmetric regardless of whether the prediction over- or under-shot", () => {
    const over = evaluatePrediction(90, reliability(80));
    const under = evaluatePrediction(80, reliability(90));
    expect(over.errorPoints).toBe(under.errorPoints);
  });
});
