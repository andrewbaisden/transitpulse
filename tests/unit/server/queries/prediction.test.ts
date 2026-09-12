import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getLinePredictionSummary } from "@/server/queries/prediction";
import { seedDemoData } from "../../../support/seed-demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_START = new Date("2026-12-01T00:00:00.000Z");
const TARGET_END = new Date(TARGET_START.getTime() + DAY_MS);
const EVALUATED_TARGET_START = new Date("2026-11-30T00:00:00.000Z");
const EVALUATED_TARGET_END = TARGET_START;

describe("getLinePredictionSummary", () => {
  let lineId: string;

  beforeAll(async () => {
    await seedDemoData();
    const jubilee = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "jubilee" } },
    });
    lineId = jubilee.id;
  });

  afterAll(async () => {
    await prisma.reliabilityPrediction.deleteMany({ where: { lineId, source: "demo" } });
  });

  it("returns null for both fields when no predictions exist", async () => {
    const otherLine = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });
    const summary = await getLinePredictionSummary(otherLine.id);
    expect(summary).toEqual({ latest: null, accuracy: null });
  });

  it("returns the latest not-yet-evaluated prediction and average accuracy from evaluated ones", async () => {
    await prisma.reliabilityPrediction.upsert({
      where: {
        lineId_source_targetWindowStart_targetWindowEnd: {
          lineId,
          source: "demo",
          targetWindowStart: TARGET_START,
          targetWindowEnd: TARGET_END,
        },
      },
      create: {
        lineId,
        source: "demo",
        predictedAt: TARGET_START,
        targetWindowStart: TARGET_START,
        targetWindowEnd: TARGET_END,
        predictedGoodServicePercent: 90,
        algorithmVersion: 1,
      },
      update: {},
    });
    await prisma.reliabilityPrediction.upsert({
      where: {
        lineId_source_targetWindowStart_targetWindowEnd: {
          lineId,
          source: "demo",
          targetWindowStart: EVALUATED_TARGET_START,
          targetWindowEnd: EVALUATED_TARGET_END,
        },
      },
      create: {
        lineId,
        source: "demo",
        predictedAt: EVALUATED_TARGET_START,
        targetWindowStart: EVALUATED_TARGET_START,
        targetWindowEnd: EVALUATED_TARGET_END,
        predictedGoodServicePercent: 90,
        algorithmVersion: 1,
        actualGoodServicePercent: 80,
        evaluatedAt: EVALUATED_TARGET_END,
      },
      update: {
        actualGoodServicePercent: 80,
        evaluatedAt: EVALUATED_TARGET_END,
      },
    });

    const summary = await getLinePredictionSummary(lineId);

    expect(summary.latest).toEqual({
      predictedGoodServicePercent: 90,
      targetWindowStart: TARGET_START,
      targetWindowEnd: TARGET_END,
      algorithmVersion: 1,
    });
    expect(summary.accuracy).toEqual({ averageErrorPoints: 10, evaluatedCount: 1 });
  });
});
