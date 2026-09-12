import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getStationOccupancy } from "@/server/queries/occupancy";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("getStationOccupancy", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("returns occupancy per line serving the station, honoring the given time", async () => {
    const stratford = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "stratford" } },
    });
    const now = new Date("2026-09-11T07:05:00Z"); // 08:05 London (BST)

    const results = await getStationOccupancy(stratford.id, now);

    const central = results.find((r) => r.lineName === "Central");
    expect(central?.occupancy).toEqual({
      level: 4,
      label: "Busy",
      timeSlice: "0800-0815",
      confidence: "typical",
      source: "demo",
    });

    const jubilee = results.find((r) => r.lineName === "Jubilee");
    expect(jubilee?.occupancy?.level).toBe(3);

    // stratford is served by elizabeth too, but the demo fixture has no
    // occupancy entries for that pair — honest null, not a fabricated value.
    const elizabeth = results.find((r) => r.lineName === "Elizabeth line");
    expect(elizabeth?.occupancy).toBeNull();
  });

  it("returns occupancy: null for a time with no matching fixture entry, without throwing", async () => {
    const bank = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "bank" } },
    });
    const now = new Date("2026-09-11T09:05:00Z"); // 10:05 London — not covered

    const results = await getStationOccupancy(bank.id, now);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.occupancy === null)).toBe(true);
  });

  it("returns an empty array for an unknown stop id", async () => {
    expect(await getStationOccupancy("does-not-exist")).toEqual([]);
  });
});
