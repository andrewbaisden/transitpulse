import { prisma } from "@/server/db/client";
import { getStopArrivals } from "@/server/domain/live/get-stop-arrivals";

export interface ArrivalBoardRow {
  lineId: string | null; // null if the arrival references a line we haven't ingested
  lineName: string;
  lineColor: string | null;
  destinationName: string;
  expectedArrival: Date;
}

export interface ArrivalBoard {
  source: string;
  fetchedAt: Date;
  rows: ArrivalBoardRow[];
  // true if the live provider call failed — the page should say arrivals
  // aren't available right now, never show a stale or empty-looking board
  // as if it were current (see AGENTS.md: never fabricate transit values).
  unavailable: boolean;
}

/**
 * Unlike every other query in this directory (ADR-008: "plain async
 * functions calling Prisma"), this one also makes a live provider call via
 * src/server/domain/live/ — arrivals aren't ingested/stored, so there's no
 * Prisma table to read them from. See DECISIONS.md ADR-015.
 */
export async function getArrivalBoard(stopId: string): Promise<ArrivalBoard | null> {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
    select: { source: true, externalRef: true },
  });
  if (!stop) return null;

  try {
    const arrivals = await getStopArrivals(stop.source, stop.externalRef);

    const lineExternalRefs = [...new Set(arrivals.map((a) => a.lineExternalRef))];
    const lines = lineExternalRefs.length
      ? await prisma.line.findMany({
          where: { source: stop.source, externalRef: { in: lineExternalRefs } },
        })
      : [];
    const lineByExternalRef = new Map(lines.map((line) => [line.externalRef, line]));

    return {
      source: stop.source,
      fetchedAt: new Date(),
      unavailable: false,
      rows: arrivals.map((arrival) => {
        const line = lineByExternalRef.get(arrival.lineExternalRef);
        return {
          lineId: line?.id ?? null,
          lineName: line?.name ?? arrival.lineExternalRef,
          lineColor: line?.color ?? null,
          destinationName: arrival.destinationName,
          expectedArrival: arrival.expectedArrival,
        };
      }),
    };
  } catch (error) {
    console.error(`getArrivalBoard: live fetch failed for stop ${stopId}`, error);
    return { source: stop.source, fetchedAt: new Date(), rows: [], unavailable: true };
  }
}
