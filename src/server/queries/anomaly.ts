import { prisma } from "@/server/db/client";
import { detectAnomaly } from "@/server/domain/anomaly/detect-anomaly";
import {
  calculateReliability,
  type StatusObservation,
} from "@/server/domain/reliability/calculate-reliability";
import type { ServiceStatusLevel } from "@/server/domain/types";

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const BASELINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface LineAnomaly {
  recentGoodServicePercent: number;
  baselineGoodServicePercent: number;
  deviationPoints: number;
  explanation: string;
  algorithmVersion: number;
}

/**
 * Compares a line's last 24h against its own rolling 7-day baseline
 * (the 7 days immediately before that, not overlapping it) — see
 * DECISIONS.md ADR-022. Computed on demand, same as getLineReliability:
 * no new table, no background job.
 */
export async function getLineAnomaly(
  lineId: string,
  now: Date = new Date(),
): Promise<LineAnomaly | null> {
  const recentWindowStart = new Date(now.getTime() - RECENT_WINDOW_MS);
  const baselineWindowStart = new Date(recentWindowStart.getTime() - BASELINE_WINDOW_MS);

  const rows = await prisma.serviceStatus.findMany({
    where: { lineId, recordedAt: { lt: now } },
    select: { status: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  const observations: StatusObservation[] = rows.map((row) => ({
    status: row.status as ServiceStatusLevel,
    recordedAt: row.recordedAt,
  }));

  const recent = calculateReliability(observations, recentWindowStart, now);
  const baseline = calculateReliability(observations, baselineWindowStart, recentWindowStart);

  return detectAnomaly(recent, baseline);
}
