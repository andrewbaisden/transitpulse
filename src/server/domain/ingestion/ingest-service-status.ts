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
 *
 * Also skips writing when the incoming status/description already match
 * the most recently recorded row for that line, regardless of `recordedAt`
 * — needed because TfL only reports a real `validityPeriod` for actual
 * disruptions; routine "Good Service" falls back to poll-time as
 * `recordedAt` (see `TflProvider.getServiceStatus`), which would otherwise
 * turn one continuous period of good service into one new row per poll
 * whenever this is run on a recurring cadence (Phase 7, `db:sample:tfl`).
 * See DECISIONS.md ADR-018.
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

    const latest = await prisma.serviceStatus.findFirst({
      where: { lineId, source: status.source },
      orderBy: { recordedAt: "desc" },
    });
    if (latest && latest.status === status.status && latest.description === status.description) {
      continue;
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
