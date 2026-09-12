import { describe, expect, it } from "vitest";
import { SimulationProvider } from "@/server/providers/simulation/simulation-provider";
import { ProviderServiceStatusSchema, type TransitProvider } from "@/server/providers/types";

describe("SimulationProvider", () => {
  it("has a distinct sourceName from every real provider", () => {
    const provider = new SimulationProvider();
    expect(provider.sourceName).toBe("simulation");
  });

  it("reuses the demo network structure for lines and stops", async () => {
    const provider = new SimulationProvider();
    const lines = await provider.getLines();
    const stops = await provider.getStops();

    expect(lines.length).toBeGreaterThan(0);
    expect(stops.length).toBeGreaterThan(0);
    expect(lines.map((l) => l.externalId)).toContain("central");
  });

  it("applies the default scenario: the named line gets its status, every other line is Good Service", async () => {
    const provider = new SimulationProvider();
    const statuses = await provider.getServiceStatus();

    for (const status of statuses) {
      expect(() => ProviderServiceStatusSchema.parse(status)).not.toThrow();
    }

    const central = statuses.find((s) => s.lineExternalId === "central");
    expect(central?.statusSeverityLabel).toBe("Severe Delays");
    expect(central?.description).toContain("Simulated scenario");

    const jubilee = statuses.find((s) => s.lineExternalId === "jubilee");
    expect(jubilee?.statusSeverityLabel).toBe("Good Service");
    expect(jubilee?.description).toBeUndefined();
  });

  it("applies a custom, explicit scenario instead of the default when given one", async () => {
    const provider = new SimulationProvider({
      scenario: [
        {
          lineExternalId: "jubilee",
          statusSeverityLabel: "Suspended",
          description: "Simulated track fire.",
        },
      ],
    });
    const statuses = await provider.getServiceStatus();

    const jubilee = statuses.find((s) => s.lineExternalId === "jubilee");
    expect(jubilee?.statusSeverityLabel).toBe("Suspended");

    const central = statuses.find((s) => s.lineExternalId === "central");
    expect(central?.statusSeverityLabel).toBe("Good Service");
  });

  it("does not implement arrivals, occupancy, or vehicles", () => {
    // Typed as the interface, not the concrete class — same convention as
    // demo-provider.test.ts/tfl-provider.test.ts.
    const provider: TransitProvider = new SimulationProvider();
    expect(provider.getArrivals).toBeUndefined();
    expect(provider.getOccupancy).toBeUndefined();
    expect(provider.getVehicles).toBeUndefined();
  });
});
