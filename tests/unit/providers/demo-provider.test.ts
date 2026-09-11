import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/server/providers/demo/demo-provider";
import { ProviderLineSchema, type TransitProvider } from "@/server/providers/types";

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

  it("does not implement arrivals/vehicles/occupancy (no Phase 1-3 feature needs them)", () => {
    // Typed as the interface, not the concrete class: these methods are
    // optional on TransitProvider precisely so a provider can omit them.
    const provider: TransitProvider = new DemoProvider();
    expect(provider.getArrivals).toBeUndefined();
    expect(provider.getVehicles).toBeUndefined();
    expect(provider.getOccupancy).toBeUndefined();
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
