import { prisma } from "@/server/db/client";
import type { TransitProvider } from "@/server/providers/types";
import { normalizeLine } from "./normalize";

/**
 * Provider.getLines() -> Zod validation (inside the provider) -> normalize
 * -> Prisma upsert. Upserting by the (source, externalRef) unique
 * constraint is what makes re-running ingestion idempotent, with no
 * separate id-mapping table.
 */
export async function ingestLines(provider: TransitProvider, networkId: string): Promise<void> {
  const providerLines = await provider.getLines();

  for (const providerLine of providerLines) {
    const line = normalizeLine(providerLine, provider.sourceName);

    await prisma.line.upsert({
      where: { source_externalRef: { source: line.source, externalRef: line.externalRef } },
      create: {
        name: line.name,
        mode: line.mode,
        color: line.color,
        source: line.source,
        externalRef: line.externalRef,
        networkId,
      },
      update: {
        name: line.name,
        mode: line.mode,
        color: line.color,
      },
    });
  }
}
