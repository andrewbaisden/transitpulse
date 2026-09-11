import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { DemoProvider } from "@/server/providers/demo/demo-provider";

/**
 * Runs against the real Postgres test database (see .env.test / tests/setup.ts),
 * not a mock — this is what actually proves the upsert-by-(source, externalRef)
 * pattern is idempotent, which a pure-function unit test can't.
 */
describe("ingestLines", () => {
  let networkId: string;

  beforeAll(async () => {
    const network = await prisma.network.upsert({
      where: { name: "London" },
      create: { name: "London" },
      update: {},
    });
    networkId = network.id;
  });

  it("upserts every fixture line", async () => {
    const provider = new DemoProvider();
    await ingestLines(provider, networkId);

    const lines = await prisma.line.findMany({ where: { source: "demo" } });
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.map((l) => l.name)).toContain("Central");
  });

  it("is idempotent: running ingestion twice does not duplicate rows", async () => {
    const provider = new DemoProvider();

    await ingestLines(provider, networkId);
    const firstCount = await prisma.line.count({ where: { source: "demo" } });

    await ingestLines(provider, networkId);
    const secondCount = await prisma.line.count({ where: { source: "demo" } });

    expect(secondCount).toBe(firstCount);
  });
});
