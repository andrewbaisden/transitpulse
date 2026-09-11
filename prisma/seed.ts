import "dotenv/config";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { DemoProvider } from "@/server/providers/demo/demo-provider";

/**
 * This is deliberately thin: it's the same ingestion pipeline a real
 * provider sync job (Phase 4 TfL, Phase 13 Simulation) will run, just
 * invoked once by hand against the DemoProvider instead of on a schedule.
 * If this script ever needs provider-specific logic, that logic belongs in
 * the provider/ingestion layer, not here.
 */
async function main() {
  const network = await prisma.network.upsert({
    where: { name: "London" },
    create: { name: "London", timezone: "Europe/London" },
    update: {},
  });

  const provider = new DemoProvider();

  await ingestLines(provider, network.id);
  await ingestStops(provider);
  await ingestServiceStatus(provider);

  console.log(`Seeded network "${network.name}" from provider "${provider.sourceName}".`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
