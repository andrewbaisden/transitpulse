import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getLineReliability } from "@/server/queries/reliability";
import { seedDemoData } from "../../../support/seed-demo-data";

// The demo fixture seeds one GOOD_SERVICE row for jubilee at this
// timestamp (tests/fixtures/demo/service-status.json).
const FIXTURE_RECORDED_AT = new Date("2026-09-11T07:15:00.000Z");
const NOW = new Date(FIXTURE_RECORDED_AT.getTime() + 7 * 24 * 60 * 60 * 1000);
const DELAY_START = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

describe("getLineReliability", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  afterAll(async () => {
    // DELAY_START is deliberately later than real wall-clock time (needed
    // below for a clean, deterministic coverage window) — clean it up so
    // this future-dated row doesn't permanently outrank jubilee's real
    // fixture row in `ingestServiceStatus`'s "latest by recordedAt" dedup
    // check for every other test sharing this persistent test DB (see
    // tests/unit/domain/ingestion/ingest-service-status.test.ts). Safe to
    // run even if the row was never created (e.g. the test above failed
    // before inserting it).
    const jubilee = await prisma.line.findFirst({
      where: { source: "demo", externalRef: "jubilee" },
    });
    if (!jubilee) return;
    await prisma.serviceStatus.deleteMany({
      where: { lineId: jubilee.id, source: "demo", recordedAt: DELAY_START },
    });
  });

  it("computes a time-weighted percentage from real ServiceStatus rows", async () => {
    const jubilee = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "jubilee" } },
    });

    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: { lineId: jubilee.id, source: "demo", recordedAt: DELAY_START },
      },
      create: {
        lineId: jubilee.id,
        status: "MINOR_DELAYS",
        description: "Synthetic test delay",
        source: "demo",
        recordedAt: DELAY_START,
      },
      update: {},
    });

    const reliability = await getLineReliability(jubilee.id, NOW);

    expect(reliability).not.toBeNull();
    expect(reliability?.windowDays).toBe(7);
    expect(reliability?.coverageStart).toEqual(FIXTURE_RECORDED_AT);
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
