import { prisma } from "@/server/db/client";
import type { TransitProvider } from "@/server/providers/types";
import { IngestionError } from "./ingest-stops";
import { normalizeServiceStatus } from "./normalize";

/**
 * Append-only: each ingestion run inserts a new ServiceStatus row per line
 * (that's how history accumulates for later reliability phases). Idempotent
 * on (lineId, source, recordedAt) via upsert, so re-ingesting the exact
 * same provider snapshot doesn't duplicate rows, while a genuinely new
 * recordedAt still appends. Must run after `ingestLines`.
 */
export async function ingestServiceStatus(provider: TransitProvider): Promise<void> {
  const providerStatuses = await provider.getServiceStatus();
  const domainStatuses = providerStatuses.map((status) =>
    normalizeServiceStatus(status, provider.sourceName),
  );

  const lineRows = await prisma.line.findMany({
    where: { source: provider.sourceName },
    select: { id: true, externalRef: true },
  });
  const lineIdByExternalRef = new Map(lineRows.map((row) => [row.externalRef, row.id]));

  for (const status of domainStatuses) {
    const lineId = lineIdByExternalRef.get(status.lineExternalRef);
    if (!lineId) {
      throw new IngestionError("Service status references a line that has not been ingested", {
        sourceName: provider.sourceName,
        lineExternalRef: status.lineExternalRef,
      });
    }

    await prisma.serviceStatus.upsert({
      where: {
        lineId_source_recordedAt: {
          lineId,
          source: status.source,
          recordedAt: status.recordedAt,
        },
      },
      create: {
        lineId,
        status: status.status,
        description: status.description,
        source: status.source,
        recordedAt: status.recordedAt,
      },
      update: {
        status: status.status,
        description: status.description,
      },
    });
  }
}
