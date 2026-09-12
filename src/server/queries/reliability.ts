import { prisma } from "@/server/db/client";
import {
  calculateReliability,
  type StatusObservation,
} from "@/server/domain/reliability/calculate-reliability";
import type { ServiceStatusLevel } from "@/server/domain/types";

const RELIABILITY_WINDOW_DAYS = 7;

export interface LineReliability {
  goodServicePercent: number;
  coverageStart: Date;
  coverageEnd: Date;
  windowDays: number;
  algorithmVersion: number;
}

/**
 * Computed on demand from ServiceStatus history rather than a persisted
 * table — see DECISIONS.md ADR-019 for why.
 */
export async function getLineReliability(
  lineId: string,
  now: Date = new Date(),
): Promise<LineReliability | null> {
  const rows = await prisma.serviceStatus.findMany({
    where: { lineId, recordedAt: { lt: now } },
    select: { status: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  const observations: StatusObservation[] = rows.map((row) => ({
    status: row.status as ServiceStatusLevel,
    recordedAt: row.recordedAt,
  }));

  const windowStart = new Date(now.getTime() - RELIABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const result = calculateReliability(observations, windowStart, now);
  if (!result) return null;

  return { ...result, windowDays: RELIABILITY_WINDOW_DAYS };
}
