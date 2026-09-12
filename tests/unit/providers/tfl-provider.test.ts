import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TflProviderError } from "@/server/providers/tfl/tfl-client";
import { TflProvider } from "@/server/providers/tfl/tfl-provider";
import {
  ProviderArrivalSchema,
  ProviderLineSchema,
  ProviderOccupancySchema,
  ProviderServiceStatusSchema,
  ProviderStopSchema,
  type TransitProvider,
} from "@/server/providers/types";

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "tfl");

async function fixture(fileName: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(FIXTURES_DIR, fileName), "utf-8"));
}

/**
 * Mocks global fetch and routes by URL to the small, hand-built fixtures in
 * tests/fixtures/tfl/ — shaped exactly like the real TfL Unified API
 * responses (verified against the live API while building this, not
 * guessed), trimmed to the minimum that exercises the mapping logic:
 * mode -> lines, per-line route sequence -> stops/sequence, hub resolution,
 * dedup of a stop shared by two lines, and status severity mapping.
 */
async function stubTflFetch() {
  const [lines, status, central, jubilee, hub, arrivals, crowding] = await Promise.all([
    fixture("lines.json"),
    fixture("status.json"),
    fixture("route-sequence-central.json"),
    fixture("route-sequence-jubilee.json"),
    fixture("hub.json"),
    fixture("arrivals.json"),
    fixture("crowding.json"),
  ]);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = input.toString();
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      if (url.includes("/Line/Mode/tube,overground,elizabeth-line,dlr,tram/Status")) {
        return json(status);
      }
      if (url.includes("/Line/Mode/tube,overground,elizabeth-line,dlr,tram")) {
        return json(lines);
      }
      if (url.includes("/Line/central/Route/Sequence/outbound")) {
        return json(central);
      }
      if (url.includes("/Line/jubilee/Route/Sequence/outbound")) {
        return json(jubilee);
      }
      if (url.includes("/StopPoint/HUBSTR")) {
        return json(hub);
      }
      if (url.includes("/StopPoint/stratford/Arrivals")) {
        return json(arrivals);
      }
      if (url.includes("/StopPoint/stratford/Crowding/central")) {
        return json(crowding);
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

describe("TflProvider", () => {
  beforeEach(async () => {
    await stubTflFetch();
  });

  it("requires an appKey", () => {
    expect(() => new TflProvider({ appKey: "" })).toThrow(TflProviderError);
  });

  it("maps lines through the provider schema", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const lines = await provider.getLines();

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => ProviderLineSchema.parse(line)).not.toThrow();
    }
    expect(lines.map((l) => l.externalId)).toEqual(["central", "jubilee"]);
    expect(lines[0].modeExternalId).toBe("tube");
    // TfL's API doesn't return colour — left unset, not guessed.
    expect(lines[0].color).toBeUndefined();
  });

  it("merges a stop shared by two lines into one record with both line sequences", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const stops = await provider.getStops();

    for (const stop of stops) {
      expect(() => ProviderStopSchema.parse(stop)).not.toThrow();
    }

    const stratford = stops.find((s) => s.externalId === "stratford");
    expect(stratford).toBeDefined();
    expect(stratford?.lines).toEqual(
      expect.arrayContaining([
        { lineExternalId: "central", sequence: 0 },
        { lineExternalId: "jubilee", sequence: 0 },
      ]),
    );
  });

  it("resolves a stop's hub parent to its own HUB-type stop record", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const stops = await provider.getStops();

    const stratford = stops.find((s) => s.externalId === "stratford");
    expect(stratford?.parentExternalId).toBe("HUBSTR");

    const hub = stops.find((s) => s.externalId === "HUBSTR");
    expect(hub).toBeDefined();
    expect(hub?.stopType).toBe("HUB");
    expect(hub?.name).toBe("Stratford");
  });

  it("assigns non-hub stops a STATION type and preserves per-line sequence", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const stops = await provider.getStops();

    const bank = stops.find((s) => s.externalId === "bank");
    expect(bank?.stopType).toBe("STATION");
    expect(bank?.lines).toEqual([{ lineExternalId: "central", sequence: 2 }]);
  });

  it("maps service status, using the disruption's validity start as recordedAt", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const statuses = await provider.getServiceStatus();

    for (const status of statuses) {
      expect(() => ProviderServiceStatusSchema.parse(status)).not.toThrow();
    }

    const central = statuses.find((s) => s.lineExternalId === "central");
    expect(central?.statusSeverityLabel).toBe("Minor Delays");
    expect(central?.recordedAt).toBe("2026-09-11T08:15:00Z");

    const jubilee = statuses.find((s) => s.lineExternalId === "jubilee");
    expect(jubilee?.statusSeverityLabel).toBe("Good Service");
    // No validity period on a "Good Service" line -> falls back to "now",
    // not a fabricated/omitted timestamp.
    expect(() => new Date(jubilee?.recordedAt ?? "").toISOString()).not.toThrow();
  });

  it("throws TflProviderError on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );

    const provider = new TflProvider({ appKey: "test-key" });
    await expect(provider.getLines()).rejects.toThrow(TflProviderError);
  });

  it("throws TflProviderError on a response that fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ nope: "not a line" }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const provider = new TflProvider({ appKey: "test-key" });
    await expect(provider.getLines()).rejects.toThrow(TflProviderError);
  });

  it("does not implement vehicles yet (Phase 10+)", () => {
    // Typed as the interface, not the concrete class: these methods are
    // optional on TransitProvider precisely so a provider can omit them.
    const provider: TransitProvider = new TflProvider({ appKey: "test-key" });
    expect(provider.getVehicles).toBeUndefined();
  });

  it("maps arrivals through the provider schema", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const arrivals = await provider.getArrivals("stratford");

    expect(arrivals).toHaveLength(2);
    for (const arrival of arrivals) {
      expect(() => ProviderArrivalSchema.parse(arrival)).not.toThrow();
      expect(arrival.stopExternalId).toBe("stratford");
    }
    expect(arrivals[0].lineExternalId).toBe("central");
    expect(arrivals[0].destinationName).toBe("West Ruislip Underground Station");
    expect(arrivals[0].expectedArrival).toBe("2026-09-11T19:53:24Z");
  });

  it("maps occupancy through the provider schema", async () => {
    const provider = new TflProvider({ appKey: "test-key" });
    const occupancy = await provider.getOccupancy?.("stratford", "central");

    expect(occupancy?.length).toBeGreaterThan(0);
    for (const entry of occupancy ?? []) {
      expect(() => ProviderOccupancySchema.parse(entry)).not.toThrow();
    }
    expect(occupancy?.[0].timeSlice).toBe("0800-0815");
    expect(occupancy?.[0].level).toBe(5);
  });
});
