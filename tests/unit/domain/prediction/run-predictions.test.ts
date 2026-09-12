import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { generateAndEvaluatePredictions } from "@/server/domain/prediction/run-predictions";
import { seedDemoData } from "../../../support/seed-demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;
// Anchored well clear of other tests' synthetic data for these lines.
const NOW = new Date("2026-11-01T00:00:00.000Z");
const ONE_DAY_LATER = new Date(NOW.getTime() + DAY_MS);
const BASELINE_ROW_AT = new Date(NOW.getTime() - 8 * DAY_MS);

describe("generateAndEvaluatePredictions", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  afterAll(async () => {
    // generateAndEvaluatePredictions loops over EVERY line, not just
    // "central", and this test runs it twice (generating a second window
    // via the "a day later" run too) — clean up by these file-specific
    // windows rather than by line, or every other line's prediction test
    // sharing this DB would see a stray extra evaluated row (the same
    // shared-test-DB pollution class as ADR-021's dedup bug).
    await prisma.reliabilityPrediction.deleteMany({
      where: { source: "demo", targetWindowStart: { in: [NOW, ONE_DAY_LATER] } },
    });

    const central = await prisma.line.findFirst({
      where: { source: "demo", externalRef: "central" },
    });
    if (!central) return;
    await prisma.serviceStatus.deleteMany({
      where: { lineId: central.id, source: "demo", recordedAt: BASELINE_ROW_AT },
    });
  });

  it("generates a prediction per line with baseline data, and evaluates it once due", async () => {
    const central = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });

    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: {
          lineId: central.id,
          source: "demo",
          recordedAt: BASELINE_ROW_AT,
        },
      },
      create: {
        lineId: central.id,
        status: "GOOD_SERVICE",
        description: null,
        source: "demo",
        recordedAt: BASELINE_ROW_AT,
      },
      update: {},
    });

    const firstRun = await generateAndEvaluatePredictions(NOW);
    expect(firstRun.generated).toBeGreaterThan(0);
    expect(firstRun.evaluated).toBe(0); // nothing due yet

    const prediction = await prisma.reliabilityPrediction.findUniqueOrThrow({
      where: {
        lineId_source_targetWindowStart_targetWindowEnd: {
          lineId: central.id,
          source: "demo",
          targetWindowStart: NOW,
          targetWindowEnd: new Date(NOW.getTime() + DAY_MS),
        },
      },
    });
    expect(prediction.predictedGoodServicePercent).toBe(100);
    expect(prediction.actualGoodServicePercent).toBeNull();
    expect(prediction.evaluatedAt).toBeNull();

    // A day later, with no status change, the target window has passed —
    // this run should evaluate the earlier prediction.
    const oneDayLater = new Date(NOW.getTime() + DAY_MS);
    const secondRun = await generateAndEvaluatePredictions(oneDayLater);
    expect(secondRun.evaluated).toBeGreaterThan(0);

    const evaluated = await prisma.reliabilityPrediction.findUniqueOrThrow({
      where: { id: prediction.id },
    });
    expect(evaluated.evaluatedAt).not.toBeNull();
    expect(evaluated.actualGoodServicePercent).toBe(100);
  });
});
