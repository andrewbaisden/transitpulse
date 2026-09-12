import "dotenv/config";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { SimulationProvider } from "@/server/providers/simulation/simulation-provider";

/**
 * Manual equivalent of prisma/sync-tfl.ts for the "simulation" source —
 * proves SimulationProvider flows through the exact same ingestion
 * pipeline every other provider does. See DECISIONS.md ADR-024.
 *
 * Idempotent, same as sync-tfl.ts: upserts by (source, externalRef), so
 * safe to re-run. Creates its own separate (source="simulation") copy of
 * each line/stop — never the same row as a demo/tfl line with the same
 * externalRef, so a simulated disruption can never be mistaken for or
 * silently merged into real data. The UI badges anything with
 * `source: "simulation"` distinctly wherever a line's status is shown.
 */
async function main() {
  const network = await prisma.network.upsert({
    where: { name: "London" },
    create: { name: "London", timezone: "Europe/London" },
    update: {},
  });

  const provider = new SimulationProvider();

  await ingestLines(provider, network.id);
  await ingestStops(provider);
  await ingestServiceStatus(provider);

  console.log(`Synced network "${network.name}" from provider "${provider.sourceName}".`);
}

main()
  .catch((error: unknown) => {
    console.error("Simulation sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
