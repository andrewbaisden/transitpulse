import "dotenv/config";
import { env } from "@/lib/env";
import { prisma } from "@/server/db/client";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { TflProvider } from "@/server/providers/tfl/tfl-provider";

/**
 * Phase 7 historical sampler: polls TfL's current line status and appends
 * to the same append-only `ServiceStatus` table `db:sync:tfl` writes to —
 * no new table, since ADR-004 built `ServiceStatus` for exactly this.
 * Unlike `db:sync:tfl`, this only calls `ingestServiceStatus` (not
 * `ingestLines`/`ingestStops`), since it's meant to run far more
 * frequently than the network structure changes. Run `pnpm db:sync:tfl`
 * at least once first — this throws if TfL lines haven't been ingested yet.
 *
 * `ingestServiceStatus` itself skips writing when a poll's status/
 * description are unchanged from the last recorded row, so running this
 * repeatedly only appends a row when something actually changed — see
 * DECISIONS.md ADR-018.
 *
 * Phase 10 added `worker/index.ts` (`pnpm worker`), which runs this same
 * `ingestServiceStatus` call on a real recurring schedule via BullMQ and
 * publishes real changes to Redis for the UI's live status badges — see
 * DECISIONS.md ADR-021. This script is kept as a manual one-off (e.g. to
 * force an immediate sample without starting the worker), not the primary
 * recurring mechanism anymore.
 */
async function main() {
  if (!env.TFL_APP_KEY) {
    throw new Error("TFL_APP_KEY is not set — see .env.example");
  }

  const provider = new TflProvider({ appKey: env.TFL_APP_KEY });
  await ingestServiceStatus(provider);

  console.log(`Sampled service status from provider "${provider.sourceName}".`);
}

main()
  .catch((error: unknown) => {
    console.error("Status sampling failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
