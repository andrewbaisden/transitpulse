import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getArrivalBoard } from "@/server/queries/arrivals";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("getArrivalBoard", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("resolves live arrivals and enriches them with the ingested line's name/colour", async () => {
    const stratford = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "stratford" } },
    });

    const board = await getArrivalBoard(stratford.id);

    expect(board).not.toBeNull();
    expect(board?.unavailable).toBe(false);
    expect(board?.source).toBe("demo");
    expect(board?.rows.length).toBeGreaterThan(0);

    const central = board?.rows.find((r) => r.destinationName === "Ealing Broadway");
    expect(central).toBeDefined();
    expect(central?.lineName).toBe("Central");
    expect(central?.lineColor).toBe("#DC241F");
    expect(central?.lineId).not.toBeNull();

    // Sorted soonest-first (see getStopArrivals).
    const times = board?.rows.map((r) => r.expectedArrival.getTime()) ?? [];
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("returns an empty, non-unavailable board for a stop with no arrivals fixture", async () => {
    const liverpoolStreet = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "liverpool-street" } },
    });

    const board = await getArrivalBoard(liverpoolStreet.id);

    expect(board?.unavailable).toBe(false);
    expect(board?.rows).toEqual([]);
  });

  it("returns null for an unknown stop id", async () => {
    expect(await getArrivalBoard("does-not-exist")).toBeNull();
  });
});
