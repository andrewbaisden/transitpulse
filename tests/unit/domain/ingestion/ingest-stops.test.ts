import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ingestLines } from "@/server/domain/ingestion/ingest-lines";
import { ingestStops } from "@/server/domain/ingestion/ingest-stops";
import { DemoProvider } from "@/server/providers/demo/demo-provider";

describe("ingestStops", () => {
  const provider = new DemoProvider();

  // Self-contained: (re)ingests lines first, since stops reference them and
  // this file may run independently of ingest-lines.test.ts. Idempotent, so
  // safe to repeat.
  beforeAll(async () => {
    const network = await prisma.network.upsert({
      where: { name: "London" },
      create: { name: "London" },
      update: {},
    });
    await ingestLines(provider, network.id);
    await ingestStops(provider);
  });

  it("resolves the STATION -> PLATFORM hierarchy", async () => {
    const platform = await prisma.stop.findUniqueOrThrow({
      where: {
        source_externalRef: { source: "demo", externalRef: "stratford-central-platform" },
      },
      include: { parent: true },
    });

    expect(platform.stopType).toBe("PLATFORM");
    expect(platform.parent?.name).toBe("Stratford");
  });

  it("creates LineStop joins with the correct sequence for a multi-line interchange", async () => {
    const bondStreet = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "bond-street" } },
      include: { lines: { include: { line: true } } },
    });

    const central = bondStreet.lines.find((ls) => ls.line.name === "Central");
    expect(central?.sequence).toBe(1);
    expect(bondStreet.lines.length).toBeGreaterThanOrEqual(3);
  });

  it("is idempotent: running ingestion twice does not duplicate stops or joins", async () => {
    const beforeStops = await prisma.stop.count({ where: { source: "demo" } });
    const beforeJoins = await prisma.lineStop.count({ where: { line: { source: "demo" } } });

    await ingestStops(provider);

    const afterStops = await prisma.stop.count({ where: { source: "demo" } });
    const afterJoins = await prisma.lineStop.count({ where: { line: { source: "demo" } } });

    expect(afterStops).toBe(beforeStops);
    expect(afterJoins).toBe(beforeJoins);
  });
});
