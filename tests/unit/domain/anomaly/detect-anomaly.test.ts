import { describe, expect, it } from "vitest";
import { ANOMALY_ALGORITHM_VERSION, detectAnomaly } from "@/server/domain/anomaly/detect-anomaly";
import type { ReliabilityResult } from "@/server/domain/reliability/calculate-reliability";

const DAY_MS = 24 * 60 * 60 * 1000;

function reliability(percent: number, coverageMs: number): ReliabilityResult {
  const coverageEnd = new Date("2026-09-12T00:00:00Z");
  return {
    goodServicePercent: percent,
    coverageStart: new Date(coverageEnd.getTime() - coverageMs),
    coverageEnd,
    algorithmVersion: 1,
  };
}

describe("detectAnomaly", () => {
  it("returns null when there is no recent or no baseline result", () => {
    expect(detectAnomaly(null, reliability(90, DAY_MS))).toBeNull();
    expect(detectAnomaly(reliability(60, DAY_MS), null)).toBeNull();
    expect(detectAnomaly(null, null)).toBeNull();
  });

  it("returns null when the deviation is below the threshold (normal variation)", () => {
    const recent = reliability(88, DAY_MS);
    const baseline = reliability(95, 7 * DAY_MS);
    expect(detectAnomaly(recent, baseline)).toBeNull();
  });

  it("flags a real anomaly with an explanation, when the deviation clears the threshold", () => {
    const recent = reliability(60, DAY_MS);
    const baseline = reliability(95, 7 * DAY_MS);

    const result = detectAnomaly(recent, baseline);

    expect(result).not.toBeNull();
    expect(result?.recentGoodServicePercent).toBe(60);
    expect(result?.baselineGoodServicePercent).toBe(95);
    expect(result?.deviationPoints).toBe(35);
    expect(result?.algorithmVersion).toBe(ANOMALY_ALGORITHM_VERSION);
    expect(result?.explanation).toContain("60%");
    expect(result?.explanation).toContain("95%");
  });

  it("does not flag an anomaly from too little recent coverage, even with a large deviation", () => {
    const recent = reliability(0, 10 * 60 * 1000); // 10 minutes only
    const baseline = reliability(95, 7 * DAY_MS);
    expect(detectAnomaly(recent, baseline)).toBeNull();
  });

  it("does not flag when recent reliability is better than baseline", () => {
    const recent = reliability(99, DAY_MS);
    const baseline = reliability(80, 7 * DAY_MS);
    expect(detectAnomaly(recent, baseline)).toBeNull();
  });
});
