import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import type { ServiceStatusChange } from "@/server/domain/ingestion/ingest-service-status";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { TflProvider } from "@/server/providers/tfl/tfl-provider";

/**
 * Phase 10's standalone worker process: a second long-running `tsx`
 * entrypoint (`pnpm worker`), not a separate package — it reuses
 * `src/server/*` directly, same as `prisma/sync-tfl.ts` and
 * `prisma/sample-status.ts` (which this replaces). See DECISIONS.md
 * ADR-021 for why no monorepo split was needed for this.
 *
 * Two repeatable BullMQ jobs on one queue:
 * - "sync-tfl": the full ingestLines/ingestStops/ingestServiceStatus
 *   sequence, every 6 hours (structural data changes rarely).
 * - "sample-status": ingestServiceStatus only, every 2 minutes (replaces
 *   the manual/cron cadence `db:sample:tfl` was standing in for — ADR-018).
 *
 * Every real status change either job detects is published to Redis for
 * the SSE route (src/app/api/live/status/route.ts) to relay to the UI.
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;
const STATUS_UPDATES_CHANNEL = "service-status-updates";

const QUEUE_NAME = "transitpulse-sync";

async function publishChanges(redis: IORedis, changes: ServiceStatusChange[]): Promise<void> {
  for (const change of changes) {
    await redis.publish(
      STATUS_UPDATES_CHANNEL,
      JSON.stringify({
        lineId: change.lineId,
        status: change.status,
        description: change.description,
        recordedAt: change.recordedAt.toISOString(),
      }),
    );
  }
}

async function main() {
  if (!env.TFL_APP_KEY) {
    throw new Error("TFL_APP_KEY is not set — see .env.example");
  }

  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const publisher = new IORedis(env.REDIS_URL);
  const provider = new TflProvider({ appKey: env.TFL_APP_KEY });

  const queue = new Queue(QUEUE_NAME, { connection });
  // BullMQ v6: repeatable jobs go through upsertJobScheduler, not
  // Queue.add({ repeat }) (removed in v6) — upserting by schedulerId on
  // every worker startup is idempotent, so restarting never duplicates
  // the schedule.
  await queue.upsertJobScheduler(
    "sync-tfl-schedule",
    { every: SIX_HOURS_MS },
    { name: "sync-tfl" },
  );
  await queue.upsertJobScheduler(
    "sample-status-schedule",
    { every: TWO_MINUTES_MS },
    { name: "sample-status" },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "sync-tfl") {
        const network = await prisma.network.upsert({
          where: { name: "London" },
          create: { name: "London", timezone: "Europe/London" },
          update: {},
        });
        await ingestLines(provider, network.id);
        await ingestStops(provider);
        const changes = await ingestServiceStatus(provider);
        await publishChanges(publisher, changes);
        console.log(
          `[sync-tfl] synced network "${network.name}", ${changes.length} status change(s)`,
        );
      } else if (job.name === "sample-status") {
        const changes = await ingestServiceStatus(provider);
        await publishChanges(publisher, changes);
        console.log(`[sample-status] ${changes.length} status change(s)`);
      }
    },
    { connection },
  );

  worker.on("failed", (job, error) => {
    console.error(`Job "${job?.name}" failed:`, error);
  });

  console.log("TransitPulse worker started — sync-tfl every 6h, sample-status every 2m.");

  const shutdown = async () => {
    console.log("Shutting down worker...");
    await worker.close();
    await queue.close();
    await connection.quit();
    await publisher.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error("Worker failed to start:", error);
  process.exitCode = 1;
});
