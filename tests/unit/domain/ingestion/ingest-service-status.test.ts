import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestServiceStatus } from "@/server/domain/ingestion/ingest-service-status";
import { DemoProvider } from "@/server/providers/demo/demo-provider";
import type { TransitProvider } from "@/server/providers/types";

// tests/fixtures/demo/service-status.json's fixed recordedAt for every
// demo line — used below to clean up synthetic rows this file writes.
const DEMO_FIXTURE_RECORDED_AT = new Date("2026-09-11T07:15:00.000Z");

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

  afterAll(async () => {
    // Several tests below intentionally write synthetic rows with
    // real-clock-based recordedAt values to exercise dedup. A row with a
    // real-time (or future) timestamp would otherwise permanently outrank
    // the demo fixture's own fixed timestamp in `orderBy: recordedAt desc`
    // for any test — in this file or another — that later reuses the same
    // line against this shared, persistent test DB.
    await prisma.serviceStatus.deleteMany({
      where: { source: "demo", recordedAt: { not: DEMO_FIXTURE_RECORDED_AT } },
    });
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

    const secondResult = await ingestServiceStatus(provider);
    const after = await prisma.serviceStatus.count({ where: { source: "demo" } });

    expect(after).toBe(before);
    expect(secondResult).toEqual([]);
  });

  it("returns the change it wrote, and an empty array on a no-op re-ingest", async () => {
    // Not "jubilee": tests/unit/server/queries/reliability.test.ts seeds a
    // synthetic status there with recordedAt 7+ days in the future (for its
    // own window-calculation test), which permanently outranks anything
    // else by `orderBy: recordedAt desc` in this shared, persistent test
    // DB. "elizabeth" is only ever read from, never written to, elsewhere.
    const elizabeth = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "elizabeth" } },
    });
    // Unique per test run so it can never match a row left over from a
    // previous run of this file against the shared, persistent test DB.
    const uniqueDescription = `test-${Date.now()}-${Math.random()}`;
    const provider: TransitProvider = {
      sourceName: "demo",
      getLines: async () => [],
      getStops: async () => [],
      getServiceStatus: async () => [
        {
          lineExternalId: "elizabeth",
          statusSeverityLabel: "Minor Delays",
          description: uniqueDescription,
          recordedAt: new Date().toISOString(),
        },
      ],
    };

    const firstResult = await ingestServiceStatus(provider);
    expect(firstResult).toEqual([
      {
        lineId: elizabeth.id,
        status: "MINOR_DELAYS",
        description: uniqueDescription,
        recordedAt: expect.any(Date),
      },
    ]);

    const secondResult = await ingestServiceStatus(provider);
    expect(secondResult).toEqual([]);
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
