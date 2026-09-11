import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { DemoProvider } from "@/server/providers/demo/demo-provider";

/**
 * Runs the full ingestion pipeline against the test database using
 * DemoProvider. Safe to call from every integration test file's
 * `beforeAll` regardless of execution order — every step is idempotent.
 */
export async function seedDemoData(): Promise<void> {
  const provider = new DemoProvider();
  const network = await prisma.network.upsert({
    where: { name: "London" },
    create: { name: "London" },
    update: {},
  });

  await ingestLines(provider, network.id);
  await ingestStops(provider);
  await ingestServiceStatus(provider);
}
