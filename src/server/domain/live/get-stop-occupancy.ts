import { normalizeOccupancy } from "@/server/domain/ingestion/normalize";
import type { DomainOccupancy } from "@/server/domain/types";
import { getProviderForSource } from "./provider-registry";

/**
 * Live, per-request read — not ingestion. TfL's Crowding data is
 * static/historical (typical for a given time slice, not a live
 * measurement), but it's still fetched live per (stop, line) rather than
 * bulk-ingested: there's no bulk endpoint, and network coverage is
 * uncertain, so an on-demand call per station-page view is far cheaper
 * than an all-stops ingestion job of unknown yield. See DECISIONS.md
 * ADR-020.
 *
 * Still returns only `Domain*` types — the app layer never sees a
 * `Provider*` shape or a concrete provider class (AGENTS.md's provider
 * boundary rule).
 */
export async function getStopOccupancy(
  source: string,
  stopExternalRef: string,
  lineExternalRef: string,
): Promise<DomainOccupancy[]> {
  const provider = getProviderForSource(source);

  if (!provider.getOccupancy) {
    // Never fabricate: a provider that doesn't implement occupancy means
    // honestly "no data available", not an empty-looking success.
    throw new Error(`Provider "${provider.sourceName}" does not implement getOccupancy`);
  }

  const providerOccupancy = await provider.getOccupancy(stopExternalRef, lineExternalRef);

  return providerOccupancy.map((entry) => normalizeOccupancy(entry, provider.sourceName));
}
