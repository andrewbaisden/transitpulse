import { prisma } from "@/server/db/client";
import type { TransitProvider } from "@/server/providers/types";
import { normalizeStop } from "./normalize";

export class IngestionError extends Error {
  constructor(
    message: string,
    readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IngestionError";
  }
}

/**
 * Three passes, because a stop's parent (and the lines calling at it) may
 * not exist as rows yet on the first pass:
 *
 *  1. Upsert every stop's own fields (source/externalRef/name/type/coords).
 *  2. Resolve parentId now that every stop has an internal id.
 *  3. Upsert LineStop joins, now that ingest-lines has already run.
 *
 * Must run after `ingestLines` for the same provider/source.
 */
export async function ingestStops(provider: TransitProvider): Promise<void> {
  const providerStops = await provider.getStops();
  const domainStops = providerStops.map((stop) => normalizeStop(stop, provider.sourceName));

  await Promise.all(
    domainStops.map((stop) =>
      prisma.stop.upsert({
        where: { source_externalRef: { source: stop.source, externalRef: stop.externalRef } },
        create: {
          name: stop.name,
          stopType: stop.stopType,
          lat: stop.lat,
          lon: stop.lon,
          source: stop.source,
          externalRef: stop.externalRef,
        },
        update: {
          name: stop.name,
          stopType: stop.stopType,
          lat: stop.lat,
          lon: stop.lon,
        },
      }),
    ),
  );

  const stopRows = await prisma.stop.findMany({
    where: { source: provider.sourceName },
    select: { id: true, externalRef: true },
  });
  const stopIdByExternalRef = new Map(stopRows.map((row) => [row.externalRef, row.id]));

  const lineRows = await prisma.line.findMany({
    where: { source: provider.sourceName },
    select: { id: true, externalRef: true },
  });
  const lineIdByExternalRef = new Map(lineRows.map((row) => [row.externalRef, row.id]));

  await Promise.all(
    domainStops
      .filter((stop) => stop.parentExternalRef !== null)
      .map((stop) => {
        const stopId = stopIdByExternalRef.get(stop.externalRef);
        const parentId = stopIdByExternalRef.get(stop.parentExternalRef as string);
        if (!stopId || !parentId) {
          throw new IngestionError("Stop parent could not be resolved", {
            sourceName: provider.sourceName,
            externalRef: stop.externalRef,
            parentExternalRef: stop.parentExternalRef,
          });
        }
        return prisma.stop.update({ where: { id: stopId }, data: { parentId } });
      }),
  );

  for (const stop of domainStops) {
    const stopId = stopIdByExternalRef.get(stop.externalRef);
    if (!stopId) {
      throw new IngestionError("Stop could not be resolved after upsert", {
        sourceName: provider.sourceName,
        externalRef: stop.externalRef,
      });
    }

    for (const line of stop.lines) {
      const lineId = lineIdByExternalRef.get(line.lineExternalRef);
      if (!lineId) {
        throw new IngestionError("Stop references a line that has not been ingested", {
          sourceName: provider.sourceName,
          stopExternalRef: stop.externalRef,
          lineExternalRef: line.lineExternalRef,
        });
      }

      await prisma.lineStop.upsert({
        where: { lineId_stopId: { lineId, stopId } },
        create: { lineId, stopId, sequence: line.sequence },
        update: { sequence: line.sequence },
      });
    }
  }
}
