import {
  type ProviderArrival,
  ProviderArrivalSchema,
  type ProviderLine,
  ProviderLineSchema,
  type ProviderOccupancy,
  ProviderOccupancySchema,
  type ProviderServiceStatus,
  ProviderServiceStatusSchema,
  type ProviderStop,
  ProviderStopSchema,
  type TransitProvider,
} from "@/server/providers/types";
import {
  TflArrivalRawSchema,
  TflCrowdingRawSchema,
  TflHubStopPointRawSchema,
  TflLineRawSchema,
  TflLineWithStatusRawSchema,
  TflProviderError,
  TflRouteSequenceRawSchema,
  tflRequest,
} from "./tfl-client";

/**
 * Real TfL Unified API adapter — see DECISIONS.md ADR-014 for the scoping
 * decisions behind this implementation (rail modes only, no line colour,
 * status severity mapping, per-branch sequence numbering, hub resolution).
 *
 * Every raw TfL response is validated (tflRequest) BEFORE mapping, and
 * every mapped record is re-validated through the same Provider*Schema a
 * malformed DemoProvider fixture would hit (ADR-006) — this is what keeps
 * the domain/ingestion layer honestly provider-agnostic.
 */

// Bus excluded deliberately: ~700 routes/thousands of stops would dwarf the
// rail network this phase targets. See DECISIONS.md ADR-014.
const DEFAULT_MODES = ["tube", "overground", "elizabeth-line", "dlr", "tram"];

/**
 * Runs `fn` over `items` with at most `limit` in flight at once — used for
 * the per-hub StopPoint lookups below, which can't be batched (see the
 * comment at the call site) but shouldn't be fully serial either given the
 * real rail network has 90+ distinct hubs.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface StopAccumulator {
  name: string;
  lat?: number;
  lon?: number;
  stopType: "STATION" | "HUB";
  parentExternalId?: string;
  lines: Map<string, number>; // lineExternalId -> sequence
}

export interface TflProviderConfig {
  appKey: string;
  modes?: string[];
  baseUrl?: string;
}

export class TflProvider implements TransitProvider {
  readonly sourceName = "tfl";
  private readonly appKey: string;
  private readonly modes: string[];
  private readonly baseUrl: string;

  constructor(config: TflProviderConfig) {
    if (!config.appKey) {
      throw new TflProviderError("TflProvider requires an appKey", {});
    }
    this.appKey = config.appKey;
    this.modes = config.modes ?? DEFAULT_MODES;
    this.baseUrl = config.baseUrl ?? "https://api.tfl.gov.uk";
  }

  private url(path: string): string {
    const u = new URL(path, this.baseUrl);
    u.searchParams.set("app_key", this.appKey);
    return u.toString();
  }

  async getLines(): Promise<ProviderLine[]> {
    const raw = await tflRequest(
      this.url(`/Line/Mode/${this.modes.join(",")}`),
      TflLineRawSchema.array(),
    );

    return raw.map((line) =>
      ProviderLineSchema.parse({
        externalId: line.id,
        name: line.name,
        modeExternalId: line.modeName,
        // TfL's API returns no branding colour for a line — left unset
        // rather than hardcoded (see ADR-014) instead of risking a stale
        // guess at the official hex value.
      }),
    );
  }

  async getStops(): Promise<ProviderStop[]> {
    const lines = await this.getLines();
    const stops = new Map<string, StopAccumulator>();

    for (const line of lines) {
      const sequence = await tflRequest(
        this.url(`/Line/${line.externalId}/Route/Sequence/outbound`),
        TflRouteSequenceRawSchema,
      );

      for (const branch of sequence.stopPointSequences) {
        branch.stopPoint.forEach((stopPoint, index) => {
          const existing = stops.get(stopPoint.id);
          const entry: StopAccumulator = existing ?? {
            name: stopPoint.name,
            lat: stopPoint.lat,
            lon: stopPoint.lon,
            stopType: "STATION",
            parentExternalId: stopPoint.parentId,
            lines: new Map(),
          };
          if (!entry.lines.has(line.externalId)) {
            entry.lines.set(line.externalId, index);
          }
          stops.set(stopPoint.id, entry);
        });
      }
    }

    const hubIds = [
      ...new Set(
        [...stops.values()]
          .map((entry) => entry.parentExternalId)
          .filter((id): id is string => id !== undefined),
      ),
    ];

    // One request per hub id, not batched: TfL's /StopPoint/{ids} batch
    // form has an undocumented size limit (found by testing against the
    // real API — it 400s somewhere between 30 and 40 ids), but more
    // importantly, looking up a station-level id that's part of a hub
    // (e.g. "910GBUSHEY") returns the hub's OWN canonical id
    // (e.g. "HUBBSH") in the response body, not the id that was requested.
    // A batch response's entries can't be reliably matched back to which
    // requested id produced them, so each hub id a child stop actually
    // references is looked up individually and stored under THAT id
    // (ignoring whatever id the response itself claims) — otherwise
    // ingestStops can't resolve the parent relationship at all. See
    // DECISIONS.md ADR-014.
    await mapWithConcurrency(hubIds, 10, async (hubId) => {
      const hub = await tflRequest(this.url(`/StopPoint/${hubId}`), TflHubStopPointRawSchema);
      stops.set(hubId, {
        name: hub.commonName,
        lat: hub.lat,
        lon: hub.lon,
        stopType: "HUB",
        lines: new Map(),
      });
    });

    return [...stops.entries()].map(([externalId, entry]) =>
      ProviderStopSchema.parse({
        externalId,
        name: entry.name,
        stopType: entry.stopType,
        parentExternalId: entry.parentExternalId,
        lat: entry.lat,
        lon: entry.lon,
        lines: [...entry.lines.entries()].map(([lineExternalId, seq]) => ({
          lineExternalId,
          sequence: seq,
        })),
      }),
    );
  }

  async getServiceStatus(): Promise<ProviderServiceStatus[]> {
    const recordedAtFallback = new Date().toISOString();
    const raw = await tflRequest(
      this.url(`/Line/Mode/${this.modes.join(",")}/Status`),
      TflLineWithStatusRawSchema.array(),
    );

    const statuses: ProviderServiceStatus[] = [];
    for (const line of raw) {
      for (const lineStatus of line.lineStatuses) {
        statuses.push(
          ProviderServiceStatusSchema.parse({
            lineExternalId: line.id,
            statusSeverityLabel: lineStatus.statusSeverityDescription,
            description: lineStatus.reason,
            recordedAt: lineStatus.validityPeriods[0]?.fromDate ?? recordedAtFallback,
          }),
        );
      }
    }
    return statuses;
  }

  async getArrivals(stopExternalId: string): Promise<ProviderArrival[]> {
    const raw = await tflRequest(
      this.url(`/StopPoint/${stopExternalId}/Arrivals`),
      TflArrivalRawSchema.array(),
    );

    return raw.map((arrival) =>
      ProviderArrivalSchema.parse({
        stopExternalId,
        lineExternalId: arrival.lineId,
        destinationName: arrival.destinationName,
        expectedArrival: arrival.expectedArrival,
      }),
    );
  }

  async getOccupancy(stopExternalId: string, lineExternalId: string): Promise<ProviderOccupancy[]> {
    const raw = await tflRequest(
      this.url(`/StopPoint/${stopExternalId}/Crowding/${lineExternalId}?direction=all`),
      TflCrowdingRawSchema,
    );

    // The response includes every line serving the stop (only the
    // requested one carries populated crowding data) — match by id rather
    // than assuming array position/order.
    const matchingLine = raw.lines.find((line) => line.id === lineExternalId);
    const loadings = matchingLine?.crowding?.trainLoadings ?? [];

    return loadings.map((loading) =>
      ProviderOccupancySchema.parse({ timeSlice: loading.timeSlice, level: loading.value }),
    );
  }

  // getVehicles intentionally not implemented — reserved for Phase 10.
}
