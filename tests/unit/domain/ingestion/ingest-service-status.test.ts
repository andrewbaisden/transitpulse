import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { DemoProvider } from "@/server/providers/demo/demo-provider";

describe("ingestServiceStatus", () => {
  const provider = new DemoProvider();

  beforeAll(async () => {
    const network = await prisma.network.upsert({
      where: { name: "London" },
      create: { name: "London" },
      update: {},
    });
    await ingestLines(provider, network.id);
  });

  it("records a status row per line", async () => {
    await ingestServiceStatus(provider);

    const central = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });
    const statuses = await prisma.serviceStatus.findMany({ where: { lineId: central.id } });

    expect(statuses.length).toBeGreaterThanOrEqual(1);
    expect(statuses[0].status).toBe("MINOR_DELAYS");
  });

  it("is idempotent for the same (line, source, recordedAt): re-ingesting the same snapshot does not append a duplicate row", async () => {
    await ingestServiceStatus(provider);
    const before = await prisma.serviceStatus.count({ where: { source: "demo" } });

    await ingestServiceStatus(provider);
    const after = await prisma.serviceStatus.count({ where: { source: "demo" } });

    expect(after).toBe(before);
  });
});
