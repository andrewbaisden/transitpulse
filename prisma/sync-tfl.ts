import "dotenv/config";
import { env } from "@/lib/env";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { TflProvider } from "@/server/providers/tfl/tfl-provider";

/**
 * Manual equivalent of prisma/seed.ts for the "tfl" source: runs the same
 * ingestion pipeline against TflProvider instead of DemoProvider. Per
 * AGENTS.md's provider boundary rule, this is one of the only two places
 * (alongside src/server/domain/ingestion/*) allowed to import a concrete
 * provider directly — a stand-in for the scheduled sync job Phase 10 adds.
 *
 * Idempotent: re-running upserts by (source, externalRef) rather than
 * duplicating rows (see DECISIONS.md ADR-005), so it's safe to run
 * repeatedly by hand while there's no scheduler yet.
 *
 * Caution: the query layer (src/server/queries/*) doesn't filter by
 * `source` yet — that's a UI concern for whichever phase actually wires
 * live TfL data into the pages, not this one. Running this against a
 * database that already has `pnpm db:seed`'s demo data will leave BOTH
 * sources' lines/stops in the same tables, and the network overview will
 * show duplicates (e.g. two "Central" lines). Reset the dev DB first
 * (`pnpm exec prisma migrate reset`, without running `db:seed` after) for
 * a clean TfL-only dataset.
 */
async function main() {
  if (!env.TFL_APP_KEY) {
    throw new Error("TFL_APP_KEY is not set — see .env.example");
  }

  const network = await prisma.network.upsert({
    where: { name: "London" },
    create: { name: "London", timezone: "Europe/London" },
    update: {},
  });

  const provider = new TflProvider({ appKey: env.TFL_APP_KEY });

  await ingestLines(provider, network.id);
  await ingestStops(provider);
  await ingestServiceStatus(provider);

  console.log(`Synced network "${network.name}" from provider "${provider.sourceName}".`);
}

main()
  .catch((error: unknown) => {
    console.error("TfL sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
