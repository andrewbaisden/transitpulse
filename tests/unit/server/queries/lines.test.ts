import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getLineDetail } from "@/server/queries/lines";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("getLineDetail", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("returns stops ordered by sequence and excludes platform-level children", async () => {
    const central = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });

    const detail = await getLineDetail(central.id);

    expect(detail).not.toBeNull();
    const names = detail?.stops.map((s) => s.name) ?? [];
    expect(names).toEqual([
      "Bond Street",
      "Oxford Circus",
      "Tottenham Court Road",
      "Bank",
      "Liverpool Street",
      "Stratford",
      "Hainault",
      "Epping",
    ]);
    expect(names).not.toContain("Stratford (Central line platform)");
  });

  it("returns null for an unknown line id", async () => {
    expect(await getLineDetail("does-not-exist")).toBeNull();
  });
});
