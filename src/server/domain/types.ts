/**
 * TransitPulse's own internal vocabulary. These types mirror the Prisma
 * models closely but are kept as plain TS so domain logic (normalization,
 * ingestion) is unit-testable without touching a database.
 *
 * `source` + `externalRef` on Line/Stop are the provenance pattern used
 * throughout: which provider populated this row, and that provider's own id
 * for it. See DECISIONS.md ADR-005.
 */

export type TransportMode = "TUBE" | "OVERGROUND" | "ELIZABETH_LINE" | "DLR" | "BUS" | "TRAM";

export type StopType = "HUB" | "STATION" | "PLATFORM";

export type ServiceStatusLevel =
  | "GOOD_SERVICE"
  | "MINOR_DELAYS"
  | "SEVERE_DELAYS"
  | "PART_CLOSURE"
  | "SUSPENDED"
  | "SPECIAL_SERVICE"
  | "UNKNOWN";

export interface DomainLine {
  name: string;
  mode: TransportMode;
  color: string | null;
  source: string;
  externalRef: string;
}

export interface DomainStopLine {
  lineExternalRef: string;
  sequence: number;
}

export interface DomainStop {
  name: string;
  stopType: StopType;
  parentExternalRef: string | null;
  lat: number | null;
  lon: number | null;
  source: string;
  externalRef: string;
  lines: DomainStopLine[];
}

export interface DomainServiceStatus {
  lineExternalRef: string;
  status: ServiceStatusLevel;
  description: string | null;
  source: string;
  recordedAt: Date;
}

export interface DomainArrival {
  lineExternalRef: string;
  destinationName: string;
  expectedArrival: Date;
  // Provenance (ADR-005): which provider this prediction came from. Never
  // persisted — arrivals are fetched live per request (see
  // src/server/domain/live/), not ingested into Postgres.
  source: string;
}
