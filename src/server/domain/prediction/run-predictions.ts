import { prisma } from "@/server/db/client";
import { evaluatePrediction } from "@/server/domain/prediction/evaluate-prediction";
import { predictReliability } from "@/server/domain/prediction/predict-reliability";
import {
  calculateReliability,
  type StatusObservation,
} from "@/server/domain/reliability/calculate-reliability";
import type { ServiceStatusLevel } from "@/server/domain/types";

const BASELINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PREDICTION_HORIZON_MS = 24 * 60 * 60 * 1000;

export interface PredictionRunSummary {
  generated: number;
  evaluated: number;
}

async function loadObservations(lineId: string, before: Date): Promise<StatusObservation[]> {
  const rows = await prisma.serviceStatus.findMany({
    where: { lineId, recordedAt: { lt: before } },
    select: { status: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });
  return rows.map((row) => ({
    status: row.status as ServiceStatusLevel,
    recordedAt: row.recordedAt,
  }));
}

/**
 * Meant to run on a recurring cadence (Phase 10's worker, `pnpm predict`
 * for a manual one-off): first evaluates any predictions whose target
 * window has now passed, then generates a fresh prediction per line for
 * the next 24h using the current 7-day baseline. See DECISIONS.md
 * ADR-023.
 */
export async function generateAndEvaluatePredictions(
  now: Date = new Date(),
): Promise<PredictionRunSummary> {
  let evaluated = 0;
  let generated = 0;

  const duePredictions = await prisma.reliabilityPrediction.findMany({
    where: { targetWindowEnd: { lte: now }, evaluatedAt: null },
  });

  for (const prediction of duePredictions) {
    const observations = await loadObservations(prediction.lineId, prediction.targetWindowEnd);
    const actual = calculateReliability(
      observations,
      prediction.targetWindowStart,
      prediction.targetWindowEnd,
    );
    // No data for that window yet (shouldn't usually happen for a past
    // window) — leave unevaluated and try again next run rather than
    // recording a fabricated outcome.
    if (!actual) continue;

    const evaluation = evaluatePrediction(prediction.predictedGoodServicePercent, actual);
    await prisma.reliabilityPrediction.update({
      where: { id: prediction.id },
      data: { actualGoodServicePercent: evaluation.actualGoodServicePercent, evaluatedAt: now },
    });
    evaluated += 1;
  }

  const lines = await prisma.line.findMany({ select: { id: true, source: true } });
  const targetWindowStart = now;
  const targetWindowEnd = new Date(now.getTime() + PREDICTION_HORIZON_MS);
  const baselineWindowStart = new Date(now.getTime() - BASELINE_WINDOW_MS);

  for (const line of lines) {
    const observations = await loadObservations(line.id, now);
    const baseline = calculateReliability(observations, baselineWindowStart, now);
    const prediction = predictReliability(baseline);
    if (!prediction) continue;

    await prisma.reliabilityPrediction.upsert({
      where: {
        lineId_source_targetWindowStart_targetWindowEnd: {
          lineId: line.id,
          source: line.source,
          targetWindowStart,
          targetWindowEnd,
        },
      },
      create: {
        lineId: line.id,
        source: line.source,
        predictedAt: now,
        targetWindowStart,
        targetWindowEnd,
        predictedGoodServicePercent: prediction.predictedGoodServicePercent,
        algorithmVersion: prediction.algorithmVersion,
      },
      update: {
        predictedAt: now,
        predictedGoodServicePercent: prediction.predictedGoodServicePercent,
        algorithmVersion: prediction.algorithmVersion,
      },
    });
    generated += 1;
  }

  return { generated, evaluated };
}
