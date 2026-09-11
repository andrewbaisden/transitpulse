import { normalizeArrival } from "@/server/domain/ingestion/normalize";
import type { DomainArrival } from "@/server/domain/types";
import { getProviderForSource } from "./provider-registry";

/**
 * Live, per-request read — not ingestion. Unlike Line/Stop/ServiceStatus,
 * arrival predictions are never written to Postgres: they're seconds-old
 * by the time they'd be read back, so persisting them would just be a
 * slower, staler cache. Every call hits the provider directly.
 *
 * Still returns only `Domain*` types — the app layer never sees a
 * `Provider*` shape or a concrete provider class (AGENTS.md's provider
 * boundary rule; see DECISIONS.md ADR-015 for why this file, not
 * domain/ingestion/, is where that boundary is enforced for live reads).
 */
export async function getStopArrivals(
  source: string,
  stopExternalRef: string,
): Promise<DomainArrival[]> {
  const provider = getProviderForSource(source);

  if (!provider.getArrivals) {
    // Never fabricate: a provider that doesn't implement arrivals means
    // honestly "no live data available", not an empty-looking success.
    throw new Error(`Provider "${provider.sourceName}" does not implement getArrivals`);
  }

  const providerArrivals = await provider.getArrivals(stopExternalRef);

  return providerArrivals
    .map((arrival) => normalizeArrival(arrival, provider.sourceName))
    .sort((a, b) => a.expectedArrival.getTime() - b.expectedArrival.getTime());
}
