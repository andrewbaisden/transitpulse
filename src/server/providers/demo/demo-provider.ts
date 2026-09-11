import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  type ProviderLine,
  ProviderLineSchema,
  type ProviderServiceStatus,
  ProviderServiceStatusSchema,
  type ProviderStop,
  ProviderStopSchema,
  type TransitProvider,
} from "@/server/providers/types";

/**
 * Reads demo/fixture transit data from tests/fixtures/demo/*.json and
 * validates it through the exact same Zod schemas a real provider's HTTP
 * response would go through (see providers/types.ts). This is deliberate:
 * it's what proves the ingestion pipeline doesn't secretly depend on
 * anything specific to how DemoProvider gets its data.
 *
 * These are also the fixtures the unit tests read, so seed data and test
 * data can never drift apart.
 */

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "demo");

async function readFixture<T>(fileName: string, schema: z.ZodType<T>): Promise<T[]> {
  const raw = await readFile(path.join(FIXTURES_DIR, fileName), "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return z.array(schema).parse(parsed);
}

export class DemoProvider implements TransitProvider {
  readonly sourceName = "demo";

  async getLines(): Promise<ProviderLine[]> {
    return readFixture("lines.json", ProviderLineSchema);
  }

  async getStops(): Promise<ProviderStop[]> {
    return readFixture("stops.json", ProviderStopSchema);
  }

  async getServiceStatus(): Promise<ProviderServiceStatus[]> {
    return readFixture("service-status.json", ProviderServiceStatusSchema);
  }

  // getArrivals / getVehicles / getOccupancy intentionally not implemented —
  // no Phase 1-3 feature needs them yet (they're optional on the
  // TransitProvider interface for exactly this reason).
}
