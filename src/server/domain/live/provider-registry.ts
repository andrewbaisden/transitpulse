import { env } from "@/lib/env";
import { DemoProvider } from "@/server/providers/demo/demo-provider";
import { TflProvider } from "@/server/providers/tfl/tfl-provider";
import type { TransitProvider } from "@/server/providers/types";

/**
 * The one place outside src/server/domain/ingestion/* and prisma/seed.ts
 * (or a sync job) allowed to import a concrete provider — see AGENTS.md's
 * provider boundary rule and DECISIONS.md ADR-015 for why Phase 5 adds
 * this second, narrower exception: a live per-request read (arrivals)
 * can't go through the batch ingestion pipeline the rule was written for,
 * since nothing gets persisted.
 *
 * `source` here is always a `Stop.source`/`Line.source` value already in
 * Postgres — never user input — so an unrecognized value means the data
 * was ingested by a provider this registry hasn't been told about yet, not
 * something to silently fall back on.
 */
export class UnknownProviderSourceError extends Error {
  constructor(readonly source: string) {
    super(`No provider registered for source "${source}"`);
    this.name = "UnknownProviderSourceError";
  }
}

export function getProviderForSource(source: string): TransitProvider {
  switch (source) {
    case "demo":
      return new DemoProvider();
    case "tfl":
      if (!env.TFL_APP_KEY) {
        throw new Error('Source "tfl" requires TFL_APP_KEY to be set — see .env.example');
      }
      return new TflProvider({ appKey: env.TFL_APP_KEY });
    default:
      throw new UnknownProviderSourceError(source);
  }
}
