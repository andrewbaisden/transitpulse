import { describe, expect, it } from "vitest";
import {
  NormalizationError,
  normalizeArrival,
  normalizeLine,
  normalizeServiceStatus,
  normalizeStop,
} from "@/server/domain/ingestion/normalize";
import type {
  ProviderArrival,
  ProviderLine,
  ProviderServiceStatus,
  ProviderStop,
} from "@/server/providers/types";

describe("normalizeLine", () => {
  it("maps a known mode external id to the domain enum", () => {
    const providerLine: ProviderLine = {
      externalId: "central",
      name: "Central",
      modeExternalId: "tube",
      color: "#DC241F",
    };

    expect(normalizeLine(providerLine, "demo")).toEqual({
      name: "Central",
      mode: "TUBE",
      color: "#DC241F",
      source: "demo",
      externalRef: "central",
    });
  });

  it("throws NormalizationError for an unrecognized mode", () => {
    const providerLine: ProviderLine = {
      externalId: "mystery",
      name: "Mystery Line",
      modeExternalId: "hyperloop",
    };

    expect(() => normalizeLine(providerLine, "demo")).toThrow(NormalizationError);
  });
});

describe("normalizeStop", () => {
  it("carries parent and per-line sequence information through untouched", () => {
    const providerStop: ProviderStop = {
      externalId: "stratford-central-platform",
      name: "Stratford (Central line platform)",
      stopType: "PLATFORM",
      parentExternalId: "stratford",
      lat: 51.5416,
      lon: -0.0042,
      lines: [{ lineExternalId: "central", sequence: 6 }],
    };

    const stop = normalizeStop(providerStop, "demo");

    expect(stop.stopType).toBe("PLATFORM");
    expect(stop.parentExternalRef).toBe("stratford");
    expect(stop.lines).toEqual([{ lineExternalRef: "central", sequence: 6 }]);
  });

  it("leaves parentExternalRef null for a top-level station", () => {
    const providerStop: ProviderStop = {
      externalId: "bank",
      name: "Bank",
      stopType: "STATION",
      lines: [{ lineExternalId: "central", sequence: 4 }],
    };

    expect(normalizeStop(providerStop, "demo").parentExternalRef).toBeNull();
  });
});

describe("normalizeServiceStatus", () => {
  it("maps a known severity label (case-insensitively) to the domain enum", () => {
    const providerStatus: ProviderServiceStatus = {
      lineExternalId: "central",
      statusSeverityLabel: "Minor Delays",
      description: "Signal failure at Leytonstone.",
      recordedAt: "2026-09-11T08:15:00+01:00",
    };

    const status = normalizeServiceStatus(providerStatus, "demo");

    expect(status.status).toBe("MINOR_DELAYS");
    expect(status.description).toBe("Signal failure at Leytonstone.");
    expect(status.recordedAt).toBeInstanceOf(Date);
  });

  it("throws NormalizationError for an unrecognized severity label", () => {
    const providerStatus: ProviderServiceStatus = {
      lineExternalId: "central",
      statusSeverityLabel: "Extremely Confused",
      recordedAt: "2026-09-11T08:15:00+01:00",
    };

    expect(() => normalizeServiceStatus(providerStatus, "demo")).toThrow(NormalizationError);
  });

  // Real TfL severities beyond the demo vocabulary (see ADR-014) — locking
  // in the bucketing decisions so a future edit to the map is deliberate.
  it.each([
    ["Closed", "SUSPENDED"],
    ["Not Running", "SUSPENDED"],
    ["Reduced Service", "MINOR_DELAYS"],
    ["No Step Free Access", "GOOD_SERVICE"],
    ["Bus Service", "SPECIAL_SERVICE"],
  ] as const)("maps TfL severity %s to %s", (label, expected) => {
    const providerStatus: ProviderServiceStatus = {
      lineExternalId: "central",
      statusSeverityLabel: label,
      recordedAt: "2026-09-11T08:15:00+01:00",
    };

    expect(normalizeServiceStatus(providerStatus, "tfl").status).toBe(expected);
  });
});

describe("normalizeArrival", () => {
  it("maps fields through and parses expectedArrival into a Date", () => {
    const providerArrival: ProviderArrival = {
      stopExternalId: "stratford",
      lineExternalId: "central",
      destinationName: "Ealing Broadway",
      expectedArrival: "2026-09-11T19:53:24Z",
    };

    const arrival = normalizeArrival(providerArrival, "demo");

    expect(arrival).toEqual({
      lineExternalRef: "central",
      destinationName: "Ealing Broadway",
      expectedArrival: new Date("2026-09-11T19:53:24Z"),
      source: "demo",
    });
  });
});
