import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getLineReliability } from "@/server/queries/reliability";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("getLineReliability", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("computes a time-weighted percentage from real ServiceStatus rows", async () => {
    const jubilee = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "jubilee" } },
    });

    // The demo fixture seeds one GOOD_SERVICE row for jubilee at this
    // timestamp (tests/fixtures/demo/service-status.json).
    const fixtureRecordedAt = new Date("2026-09-11T07:15:00.000Z");
    const now = new Date(fixtureRecordedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const delayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: { lineId: jubilee.id, source: "demo", recordedAt: delayStart },
      },
      create: {
        lineId: jubilee.id,
        status: "MINOR_DELAYS",
        description: "Synthetic test delay",
        source: "demo",
        recordedAt: delayStart,
      },
      update: {},
    });

    const reliability = await getLineReliability(jubilee.id, now);

    expect(reliability).not.toBeNull();
    expect(reliability?.windowDays).toBe(7);
    expect(reliability?.coverageStart).toEqual(fixtureRecordedAt);
    // 6 days GOOD_SERVICE + 1 day MINOR_DELAYS.
    expect(reliability?.goodServicePercent).toBeCloseTo((6 / 7) * 100, 1);
  });

  it("returns null when there is no observation before the given time", async () => {
    const elizabeth = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "elizabeth" } },
    });
    const beforeAnyData = new Date("2020-01-01T00:00:00Z");

    expect(await getLineReliability(elizabeth.id, beforeAnyData)).toBeNull();
  });
});
