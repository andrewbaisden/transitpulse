import "dotenv/config";
import { prisma } from "@/server/db/client";
import { generateAndEvaluatePredictions } from "@/server/domain/prediction/run-predictions";

/**
 * Manual one-off equivalent of the worker's "predict-reliability" job
 * (worker/index.ts, every 24h) — same use as prisma/sample-status.ts: force
 * an immediate run without starting the worker. See DECISIONS.md ADR-023.
 */
async function main() {
  const summary = await generateAndEvaluatePredictions();
  console.log(`Generated ${summary.generated} prediction(s), evaluated ${summary.evaluated}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Prediction run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
