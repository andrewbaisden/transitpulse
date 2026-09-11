# Architecture

## Status

This describes the system as built through **Phase 3** (static network
explorer over demo data), plus the target shape for later phases so the
current design can be checked against where it needs to go. See
[Roadmap](#roadmap-phases-4-15) for what's *not* built yet.

## System overview

```text
Transit Provider (DemoProvider today; TfL / GTFS-RT / Simulation later)
        │
        ▼
Zod validation (at the provider boundary — providers/types.ts)
        │
        ▼
Normalize (server/domain/ingestion/normalize.ts — pure functions)
        │
        ▼
Ingest (server/domain/ingestion/ingest-*.ts — Prisma upsert by (source, externalRef))
        │
        ▼
PostgreSQL (prisma/schema.prisma)
        │
        ▼
Query layer (server/queries/*.ts — plain async functions)
        │
        ▼
App Router Server Components (src/app/**)
```

Every stage above the provider boundary is provider-agnostic. `DemoProvider`
is not special-cased anywhere in the domain, ingestion, or query layers —
it's just the first of what will eventually be three `TransitProvider`
implementations (TfL, Simulation, and this one), all pushed through the
same pipeline. This is deliberate: it's what lets Phase 4 (TfL) and Phase 13
(Simulation) be additive rather than a domain rewrite.

## Provider architecture

`TransitProvider` (`src/server/providers/types.ts`):

```ts
interface TransitProvider {
  readonly sourceName: string;
  getLines(): Promise<ProviderLine[]>;
  getStops(): Promise<ProviderStop[]>;
  getServiceStatus(): Promise<ProviderServiceStatus[]>;
  getArrivals?(stopExternalId: string): Promise<ProviderArrival[]>;
  getVehicles?(): Promise<ProviderVehicle[]>;
  getOccupancy?(): Promise<ProviderOccupancy[]>;
}
```

`get*` methods return **provider-normalized** shapes (`Provider*` types) —
still provider-agnostic, but closer to "raw feed" concepts (external ids
present). These are validated by Zod schemas co-located in the same file,
so `DemoProvider` reading a fixture goes through the exact same validation
a TfL adapter's HTTP response would.

`getArrivals` / `getVehicles` / `getOccupancy` are optional on the
interface — no Phase 1-3 feature calls them. They exist now only so the
interface shape doesn't need to change when Phase 5 (arrivals), Phase 6
(vehicles), and Phase 8/11 (occupancy) implement them.

## Domain model

`src/server/domain/types.ts` holds the internal vocabulary
(`DomainLine`, `DomainStop`, `DomainServiceStatus`) — plain TypeScript,
independent of Prisma, so normalization logic is unit-testable without a
database.

`src/server/domain/ingestion/normalize.ts` maps `Provider*` → `Domain*`
(pure functions — mode/status label lookup tables, no I/O). Written in
TfL's own vocabulary (`"tube"`, `"Good Service"`) deliberately, since the
`DemoProvider` fixtures are written in that vocabulary too — the Phase 4
TfL adapter reuses this exact mapping table.

`src/server/domain/ingestion/ingest-*.ts` does `Provider.getX() → Zod parse
(inside the provider) → normalize → Prisma upsert`. Upserting on the
`(source, externalRef)` unique constraint is what makes re-ingestion
idempotent, with no separate id-mapping table.

## Data model (Phase 1-3 scope)

```text
Network 1──* Line 1──* LineStop *──1 Stop (self-referential: HUB > STATION > PLATFORM)
                │                        │
                *                        │
           ServiceStatus (append-only)   │
```

- **`Stop` is a single self-referential table** (`stopType`: `HUB` |
  `STATION` | `PLATFORM`, `parentId`), not separate Station/Stop/Platform
  tables. This matches TfL's real `StopPoint` model, so the Phase 4 adapter
  maps across without a schema change. See DECISIONS.md ADR-003.
- **`ServiceStatus` is append-only** — every ingestion run inserts a new
  row rather than updating one. Phase 1-3 UI only reads the latest row per
  line (`ORDER BY recordedAt DESC LIMIT 1`), but this means later
  reliability/history phases get historical data for free, without a
  migration. Idempotency on re-ingesting the *same* snapshot comes from a
  `(lineId, source, recordedAt)` unique constraint.
- **Provenance** (`source`, `externalRef`) lives directly on `Line` and
  `Stop` rather than a separate mapping/provenance table — the simplest
  form that still gives traceability and idempotent upserts. See
  DECISIONS.md ADR-005.
- **Deliberately not modeled yet**: `Route` (beyond `LineStop.sequence`),
  `Trip`, `Vehicle`, `ArrivalPrediction`, `Occupancy`, `Disruption`,
  `Reliability`/`CrowdingSnapshot`, `User`/`Favourite`/`Alert`. These get
  added in the phase that actually needs them.

## PostgreSQL vs Redis

Only PostgreSQL exists today. Redis/BullMQ have no real use case until
Phase 10 (background sync jobs, realtime broadcast) — see DECISIONS.md
ADR-002. When they arrive, the intended split is:

- **PostgreSQL**: authoritative persisted history — providers, networks,
  lines, stops, historical arrivals/observations, disruptions, reliability
  aggregates, favourites.
- **Redis**: latest-value cache and pub/sub for realtime fan-out (latest
  arrivals, latest vehicle positions, current status) — never the
  authoritative store for anything that needs to survive a restart.

## Data fetching / server-client boundary

Server Components read through `src/server/queries/*.ts` (thin, plain
async functions wrapping Prisma) — not raw Prisma calls scattered across
`page.tsx` files, and not React Query wrapping server-readable data.

React Query (`src/components/providers.tsx`) is scoped to exactly one
client-initiated case: search-as-you-type (`src/components/network/search-box.tsx`
→ `src/app/api/search/route.ts` → `searchStopsAndLines`). See DECISIONS.md
ADR-008 for why this split was chosen over the alternatives.

## Time handling

All timestamps stored as UTC (`TIMESTAMPTZ` / Prisma `DateTime`).
`src/lib/time.ts` is the only place that formats Europe/London wall-clock
time (via `date-fns-tz`) — callers never import `date-fns-tz` directly. See
DECISIONS.md ADR-010.

## Search

Plain Postgres `ILIKE` across `Stop.name` / `Line.name`
(`src/server/queries/search.ts`), backed by a B-tree index on `Stop.name`.
Not pg_trgm or Elasticsearch — see DECISIONS.md ADR-007 for the upgrade
trigger.

## Deployment (target, not yet configured)

Next.js app → Vercel. Postgres → a managed instance (Neon/RDS/etc,
TBD when Phase 4+ needs a persistent hosted DB rather than local Docker).
Background workers (Phase 10+) → a long-running host (Fly.io/AWS) once
BullMQ/Redis are introduced, since Vercel's serverless functions aren't
suited to long-lived queue consumers.

## Roadmap (Phases 4-15)

| Phase | Adds |
|---|---|
| 4 | `TflProvider` implementing `TransitProvider` against the real TfL Unified API |
| 5 | `getArrivals`, arrival boards, provenance on dynamic/observed data |
| 6 | MapLibre/Mapbox map layer over existing `lat`/`lon` |
| 7 | Historical sampling of real observations (delay, arrival error) |
| 8 | Reliability methodology, baselines, `Reliability` entity |
| 9 | `Occupancy` entity, `getOccupancy`, crowding source/confidence model |
| 10 | Redis, BullMQ sync workers, realtime broadcast — worker/monorepo split decided here |
| 11 | Explainable anomaly detection (deviation from rolling baseline) |
| 12 | Arrival/reliability prediction, evaluated against actual outcomes |
| 13 | `SimulationProvider` implementing the same interface — scenario simulation |
| 14 | Auth (Better Auth or Clerk), `User`/`Favourite`, personalisation |
| 15 | Sentry, PostHog, accessibility/perf/security pass, production deployment |

Full detail lives in the project brief this repo was scoped from, not
duplicated here — this table exists so the current architecture's
extension points are visible at a glance.
