import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getLineAnomaly } from "@/server/queries/anomaly";
import { seedDemoData } from "../../../support/seed-demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;
// Anchored well clear of any other test's synthetic data for "elizabeth" —
// see ingest-service-status.test.ts's comment on shared-test-DB pollution.
const NOW = new Date("2026-10-01T00:00:00.000Z");
// A week of GOOD_SERVICE, then a severe delay for the entire recent (last
// 24h) window — starting exactly at the recent/baseline boundary so it
// doesn't bleed into the baseline window's own percentage.
const BASELINE_START = new Date(NOW.getTime() - 8 * DAY_MS);
const DELAY_START = new Date(NOW.getTime() - 1 * DAY_MS);

describe("getLineAnomaly", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  afterAll(async () => {
    const elizabeth = await prisma.line.findFirst({
      where: { source: "demo", externalRef: "elizabeth" },
    });
    if (!elizabeth) return;
    await prisma.serviceStatus.deleteMany({
      where: {
        lineId: elizabeth.id,
        source: "demo",
        recordedAt: { in: [BASELINE_START, DELAY_START] },
      },
    });
  });

  it("flags an anomaly when recent reliability is far worse than the 7-day baseline", async () => {
    const elizabeth = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "elizabeth" } },
    });

    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: {
          lineId: elizabeth.id,
          source: "demo",
          recordedAt: BASELINE_START,
        },
      },
      create: {
        lineId: elizabeth.id,
        status: "GOOD_SERVICE",
        description: null,
        source: "demo",
        recordedAt: BASELINE_START,
      },
      update: {},
    });
    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: { lineId: elizabeth.id, source: "demo", recordedAt: DELAY_START },
      },
      create: {
        lineId: elizabeth.id,
        status: "SEVERE_DELAYS",
        description: "Anomaly test disruption",
        source: "demo",
        recordedAt: DELAY_START,
      },
      update: {},
    });

    const anomaly = await getLineAnomaly(elizabeth.id, NOW);

    expect(anomaly).not.toBeNull();
    expect(anomaly?.recentGoodServicePercent).toBe(0);
    expect(anomaly?.baselineGoodServicePercent).toBe(100);
    expect(anomaly?.deviationPoints).toBe(100);
  });

  it("returns null when there is no baseline history yet", async () => {
    const jubilee = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "jubilee" } },
    });
    // jubilee's only history is the fixed fixture row from 2026-09-11 —
    // far outside both the recent and baseline windows anchored at NOW.
    expect(await getLineAnomaly(jubilee.id, NOW)).toBeNull();
  });
});
