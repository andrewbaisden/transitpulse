import { beforeAll, describe, expect, it } from "vitest";
import { searchStopsAndLines } from "@/server/queries/search";
import { seedDemoData } from "../../../support/seed-demo-data";

describe("searchStopsAndLines", () => {
  beforeAll(async () => {
    await seedDemoData();
  });

  it("matches a stop by a case-insensitive partial name", async () => {
    const results = await searchStopsAndLines("strat");
    expect(results.some((r) => r.type === "stop" && r.name === "Stratford")).toBe(true);
  });

  it("matches a line by name", async () => {
    const results = await searchStopsAndLines("central");
    expect(results.some((r) => r.type === "line" && r.name === "Central")).toBe(true);
  });

  it("returns no results for a term shorter than 2 characters", async () => {
    expect(await searchStopsAndLines("s")).toEqual([]);
  });

  it("returns no results for a term that matches nothing", async () => {
    expect(await searchStopsAndLines("zzzznotarealstation")).toEqual([]);
  });
});
