import { formatLondonTime } from "@/lib/time";
import { prisma } from "@/server/db/client";
import { getStopOccupancy } from "@/server/domain/live/get-stop-occupancy";
import {
  type CurrentOccupancy,
  getCurrentOccupancy,
} from "@/server/domain/occupancy/current-occupancy";

export interface StationLineOccupancy {
  lineId: string;
  lineName: string;
  lineColor: string | null;
  occupancy: CurrentOccupancy | null; // null = not available for this line/time
}

/**
 * One entry per line serving the station, each fetched live (see
 * DECISIONS.md ADR-020/ADR-015) — a per-line try/catch means one line
 * lacking crowding data (a real, expected outcome for many stations)
 * never breaks the others.
 */
export async function getStationOccupancy(
  stopId: string,
  now: Date = new Date(),
): Promise<StationLineOccupancy[]> {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
    select: {
      source: true,
      externalRef: true,
      lines: { include: { line: true } },
    },
  });

  if (!stop) return [];

  const nowHHmm = formatLondonTime(now, "HHmm");
  const uniqueLines = [...new Map(stop.lines.map((ls) => [ls.line.id, ls.line])).values()];

  return Promise.all(
    uniqueLines.map(async (line): Promise<StationLineOccupancy> => {
      try {
        const entries = await getStopOccupancy(stop.source, stop.externalRef, line.externalRef);
        return {
          lineId: line.id,
          lineName: line.name,
          lineColor: line.color,
          occupancy: getCurrentOccupancy(entries, nowHHmm),
        };
      } catch {
        return { lineId: line.id, lineName: line.name, lineColor: line.color, occupancy: null };
      }
    }),
  );
}
