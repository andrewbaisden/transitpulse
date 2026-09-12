import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/server/providers/demo/demo-provider";
import {
  ProviderArrivalSchema,
  ProviderLineSchema,
  ProviderOccupancySchema,
  type TransitProvider,
} from "@/server/providers/types";

describe("DemoProvider", () => {
  it("returns lines matching the provider schema", async () => {
    const provider = new DemoProvider();
    const lines = await provider.getLines();

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.externalId).toBeTruthy();
      expect(line.name).toBeTruthy();
      expect(line.modeExternalId).toBeTruthy();
    }
  });

  it("returns stops matching the provider schema, including hierarchy and line sequencing", async () => {
    const provider = new DemoProvider();
    const stops = await provider.getStops();

    const platform = stops.find((stop) => stop.stopType === "PLATFORM");
    expect(platform).toBeDefined();
    expect(platform?.parentExternalId).toBeTruthy();

    const interchange = stops.find((stop) => stop.lines.length > 1);
    expect(interchange).toBeDefined();
    for (const line of interchange?.lines ?? []) {
      expect(typeof line.sequence).toBe("number");
    }
  });

  it("returns service statuses matching the provider schema", async () => {
    const provider = new DemoProvider();
    const statuses = await provider.getServiceStatus();

    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status.lineExternalId).toBeTruthy();
      expect(status.statusSeverityLabel).toBeTruthy();
      expect(() => new Date(status.recordedAt).toISOString()).not.toThrow();
    }
  });

  it("does not implement vehicles (no Phase 1-9 feature needs it yet)", () => {
    // Typed as the interface, not the concrete class: these methods are
    // optional on TransitProvider precisely so a provider can omit them.
    const provider: TransitProvider = new DemoProvider();
    expect(provider.getVehicles).toBeUndefined();
  });

  it("returns occupancy matching the provider schema", async () => {
    const provider = new DemoProvider();
    const occupancy = await provider.getOccupancy?.("bank", "central");

    expect(occupancy?.length).toBeGreaterThan(0);
    for (const entry of occupancy ?? []) {
      expect(() => ProviderOccupancySchema.parse(entry)).not.toThrow();
    }
    expect(occupancy?.[0].timeSlice).toBe("0800-0815");
    expect(occupancy?.[0].level).toBe(5);
  });

  it("returns an empty array for a stop/line pair with no occupancy fixture, not an error", async () => {
    const provider = new DemoProvider();
    expect(await provider.getOccupancy?.("bank", "jubilee")).toEqual([]);
    expect(await provider.getOccupancy?.("does-not-exist", "central")).toEqual([]);
  });

  it("returns arrivals matching the provider schema, with expectedArrival resolved against now", async () => {
    const provider = new DemoProvider();
    const before = Date.now();
    const arrivals = await provider.getArrivals("stratford");
    const after = Date.now();

    expect(arrivals.length).toBeGreaterThan(0);
    for (const arrival of arrivals) {
      expect(() => ProviderArrivalSchema.parse(arrival)).not.toThrow();
      const arrivalTime = new Date(arrival.expectedArrival).getTime();
      // Every fixture entry is a few minutes out, not hours — this just
      // pins "resolved against a live clock", not exact minute values.
      expect(arrivalTime).toBeGreaterThan(before);
      expect(arrivalTime).toBeLessThan(after + 15 * 60_000);
    }
  });

  it("returns an empty array for a stop with no arrivals fixture, not an error", async () => {
    const provider = new DemoProvider();
    expect(await provider.getArrivals("does-not-exist")).toEqual([]);
  });
});

describe("provider schema validation", () => {
  // DemoProvider validates every fixture record through these exact
  // schemas before normalization — this asserts that a malformed record
  // (missing externalId, the field a real TfL response could just as
  // easily omit) is rejected, without mutating the real fixture files
  // that other tests and the seed script share.
  it("rejects a line record missing a required field", () => {
    const result = ProviderLineSchema.safeParse({ name: "Missing externalId" });
    expect(result.success).toBe(false);
  });
});
