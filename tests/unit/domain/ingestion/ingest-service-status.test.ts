import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { DemoProvider } from "@/server/providers/demo/demo-provider";
import type { TransitProvider } from "@/server/providers/types";

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
    // Order-independent: the shared test DB persists rows across runs (and
    // other tests in this file also write to "central"), so don't assume
    // array position — just that the demo fixture's real status is present.
    expect(statuses.some((status) => status.status === "MINOR_DELAYS")).toBe(true);
  });

  it("is idempotent for the same (line, source, recordedAt): re-ingesting the same snapshot does not append a duplicate row", async () => {
    await ingestServiceStatus(provider);
    const before = await prisma.serviceStatus.count({ where: { source: "demo" } });

    await ingestServiceStatus(provider);
    const after = await prisma.serviceStatus.count({ where: { source: "demo" } });

    expect(after).toBe(before);
  });

  it("does not append a new row when only recordedAt changes but status/description are unchanged (polling noise)", async () => {
    const line = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });

    let pollCount = 0;
    const pollingProvider: TransitProvider = {
      sourceName: "demo",
      getLines: async () => [],
      getStops: async () => [],
      getServiceStatus: async () => {
        pollCount += 1;
        return [
          {
            lineExternalId: "central",
            statusSeverityLabel: "Good Service",
            recordedAt: new Date(Date.now() + pollCount * 1000).toISOString(),
          },
        ];
      },
    };

    await ingestServiceStatus(pollingProvider);
    const before = await prisma.serviceStatus.count({ where: { lineId: line.id, source: "demo" } });

    // Different recordedAt each call (simulating repeated polling), but the
    // status/description content never changes.
    await ingestServiceStatus(pollingProvider);
    const after = await prisma.serviceStatus.count({ where: { lineId: line.id, source: "demo" } });

    expect(after).toBe(before);
  });
});
