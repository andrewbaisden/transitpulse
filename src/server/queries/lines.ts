import { prisma } from "@/server/db/client";
import type { ServiceStatusLevel, TransportMode } from "@/server/domain/types";
import type { LineWithStatus } from "@/server/queries/network";

export async function getAllLines(modeFilter?: TransportMode): Promise<LineWithStatus[]> {
  const lines = await prisma.line.findMany({
    where: modeFilter ? { mode: modeFilter } : undefined,
    include: {
      serviceStatus: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return lines.map((line) => {
    const latest = line.serviceStatus[0];
    return {
      id: line.id,
      name: line.name,
      mode: line.mode as TransportMode,
      color: line.color,
      source: line.source,
      status: (latest?.status ?? "UNKNOWN") as ServiceStatusLevel,
      statusDescription: latest?.description ?? null,
      statusRecordedAt: latest?.recordedAt ?? line.updatedAt,
    };
  });
}

export interface LineStopSummary {
  id: string;
  name: string;
  stopType: string;
  sequence: number;
}

export interface LineDetail extends LineWithStatus {
  stops: LineStopSummary[];
}

export async function getLineDetail(lineId: string): Promise<LineDetail | null> {
  const line = await prisma.line.findUnique({
    where: { id: lineId },
    include: {
      serviceStatus: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      stops: {
        include: { stop: true },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!line) return null;

  const latest = line.serviceStatus[0];

  return {
    id: line.id,
    name: line.name,
    mode: line.mode,
    color: line.color,
    source: line.source,
    status: (latest?.status ?? "UNKNOWN") as ServiceStatusLevel,
    statusDescription: latest?.description ?? null,
    statusRecordedAt: latest?.recordedAt ?? line.updatedAt,
    // Platform-level child stops share the same position along the line as
    // their parent station, so collapse them here — the line page shows
    // stations, not individual platforms.
    stops: line.stops
      .filter((lineStop) => lineStop.stop.stopType !== "PLATFORM")
      .map((lineStop) => ({
        id: lineStop.stop.id,
        name: lineStop.stop.name,
        stopType: lineStop.stop.stopType,
        sequence: lineStop.sequence,
      })),
  };
}
