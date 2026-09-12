import { prisma } from "@/server/db/client";

const RECENT_EVALUATED_LIMIT = 7;

export interface LatestPrediction {
  predictedGoodServicePercent: number;
  targetWindowStart: Date;
  targetWindowEnd: Date;
  algorithmVersion: number;
}

export interface PredictionAccuracy {
  averageErrorPoints: number;
  evaluatedCount: number;
}

export interface LinePredictionSummary {
  latest: LatestPrediction | null; // most recent not-yet-evaluated prediction
  accuracy: PredictionAccuracy | null; // over the most recent evaluated predictions
}

/**
 * Reads what worker/index.ts's "predict-reliability" job (or
 * `pnpm db:predict`) already generated/evaluated — this query never
 * computes a prediction itself. See DECISIONS.md ADR-023.
 */
export async function getLinePredictionSummary(lineId: string): Promise<LinePredictionSummary> {
  const [latestRow, evaluatedRows] = await Promise.all([
    prisma.reliabilityPrediction.findFirst({
      where: { lineId, evaluatedAt: null },
      orderBy: { targetWindowStart: "desc" },
    }),
    prisma.reliabilityPrediction.findMany({
      where: { lineId, evaluatedAt: { not: null } },
      orderBy: { targetWindowStart: "desc" },
      take: RECENT_EVALUATED_LIMIT,
    }),
  ]);

  const latest: LatestPrediction | null = latestRow && {
    predictedGoodServicePercent: latestRow.predictedGoodServicePercent,
    targetWindowStart: latestRow.targetWindowStart,
    targetWindowEnd: latestRow.targetWindowEnd,
    algorithmVersion: latestRow.algorithmVersion,
  };

  let accuracy: PredictionAccuracy | null = null;
  if (evaluatedRows.length > 0) {
    const totalErrorPoints = evaluatedRows.reduce(
      (sum, row) =>
        sum + Math.abs((row.actualGoodServicePercent ?? 0) - row.predictedGoodServicePercent),
      0,
    );
    accuracy = {
      averageErrorPoints: Math.round((totalErrorPoints / evaluatedRows.length) * 10) / 10,
      evaluatedCount: evaluatedRows.length,
    };
  }

  return { latest, accuracy };
}
