import { describe, expect, it } from "vitest";
import {
  calculateReliability,
  RELIABILITY_ALGORITHM_VERSION,
  type StatusObservation,
} from "@/server/domain/reliability/calculate-reliability";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("calculateReliability", () => {
  it("returns null when there are no observations", () => {
    const result = calculateReliability(
      [],
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-08T00:00:00Z"),
    );
    expect(result).toBeNull();
  });

  it("returns null when every observation starts at or after windowEnd", () => {
    const windowEnd = new Date("2026-01-08T00:00:00Z");
    const observations: StatusObservation[] = [{ status: "GOOD_SERVICE", recordedAt: windowEnd }];

    expect(
      calculateReliability(observations, new Date("2026-01-01T00:00:00Z"), windowEnd),
    ).toBeNull();
  });

  it("does not extrapolate before the first real observation: coverage starts there, not at windowStart", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-08T00:00:00Z");
    // Only 3 hours of history exist, well inside a requested 7-day window.
    const firstObservedAt = new Date(windowEnd.getTime() - 3 * 60 * 60 * 1000);
    const observations: StatusObservation[] = [
      { status: "GOOD_SERVICE", recordedAt: firstObservedAt },
    ];

    const result = calculateReliability(observations, windowStart, windowEnd);

    expect(result).not.toBeNull();
    expect(result?.coverageStart).toEqual(firstObservedAt);
    expect(result?.goodServicePercent).toBe(100);
    expect(result?.algorithmVersion).toBe(RELIABILITY_ALGORITHM_VERSION);
  });

  it("weights a status change partway through the window correctly", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-03T00:00:00Z"); // 2-day window
    const midpoint = new Date("2026-01-02T00:00:00Z");
    const observations: StatusObservation[] = [
      { status: "GOOD_SERVICE", recordedAt: windowStart },
      { status: "MINOR_DELAYS", recordedAt: midpoint },
    ];

    const result = calculateReliability(observations, windowStart, windowEnd);

    expect(result?.goodServicePercent).toBe(50);
    expect(result?.coverageStart).toEqual(windowStart);
    expect(result?.coverageEnd).toEqual(windowEnd);
  });

  it("extends the latest status through to windowEnd (still current)", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-08T00:00:00Z");
    const observations: StatusObservation[] = [
      { status: "SEVERE_DELAYS", recordedAt: windowStart },
      { status: "GOOD_SERVICE", recordedAt: new Date(windowStart.getTime() + 6 * DAY_MS) },
    ];

    const result = calculateReliability(observations, windowStart, windowEnd);

    // 6 days severe + 1 day good = 1/7 good.
    expect(result?.goodServicePercent).toBeCloseTo((1 / 7) * 100, 1);
  });

  it("ignores observations recorded after windowEnd", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-08T00:00:00Z");
    const observations: StatusObservation[] = [
      { status: "GOOD_SERVICE", recordedAt: windowStart },
      { status: "SUSPENDED", recordedAt: new Date(windowEnd.getTime() + DAY_MS) },
    ];

    const result = calculateReliability(observations, windowStart, windowEnd);

    expect(result?.goodServicePercent).toBe(100);
  });

  it("handles an observation exactly at the window boundary", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-08T00:00:00Z");
    const observations: StatusObservation[] = [{ status: "GOOD_SERVICE", recordedAt: windowStart }];

    const result = calculateReliability(observations, windowStart, windowEnd);

    expect(result?.coverageStart).toEqual(windowStart);
    expect(result?.goodServicePercent).toBe(100);
  });

  it("does not require observations to be pre-sorted", () => {
    const windowStart = new Date("2026-01-01T00:00:00Z");
    const windowEnd = new Date("2026-01-03T00:00:00Z");
    const midpoint = new Date("2026-01-02T00:00:00Z");
    const observations: StatusObservation[] = [
      { status: "MINOR_DELAYS", recordedAt: midpoint },
      { status: "GOOD_SERVICE", recordedAt: windowStart },
    ];

    const result = calculateReliability(observations, windowStart, windowEnd);

    expect(result?.goodServicePercent).toBe(50);
  });
});
