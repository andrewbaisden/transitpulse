import { beforeAll, describe, expect, it } from "vitest";
import { getMapStops } from "@/server/queries/map";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("getMapStops", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("returns only STATION/HUB stops with coordinates, coloured by their first line", async () => {
    const stops = await getMapStops();
    const demoStops = stops.filter((s) => s.name === "Stratford");

    expect(demoStops).toHaveLength(1);
    const stratford = demoStops[0];
    expect(typeof stratford.lat).toBe("number");
    expect(typeof stratford.lon).toBe("number");
    expect(stratford.lineColor).toBeTruthy();

    // The demo fixture's one PLATFORM-type stop must never appear on the map.
    expect(stops.some((s) => s.name.includes("platform"))).toBe(false);
  });
});
