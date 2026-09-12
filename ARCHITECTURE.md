# Architecture

## Status

This describes the system as built through **Phase 13** (static network
explorer over demo data, a real `TflProvider` reachable via
`pnpm db:sync:tfl` — ADR-014 —, live arrival boards fetched per-request
via `src/server/domain/live/`, not ingested — ADR-015 —, an
interactive Leaflet map at `/map` plus a per-station location embed,
both backed by `getMapStops` over existing `lat`/`lon` — ADR-016/ADR-017 —,
a time-weighted per-line reliability figure computed on demand from
`ServiceStatus` history, `getLineReliability` — ADR-019 —, a per-station
crowding section, `getStationOccupancy`, fetched live from TfL's real
(static, never live) Crowding data — ADR-020 —, a BullMQ worker
(`worker/index.ts`, `pnpm worker`) running the sync/sample/predict jobs
on Redis, publishing real status changes over pub/sub so open pages
live-patch their status badges via Server-Sent Events — ADR-021 —,
explainable anomaly detection comparing a line's last-24h reliability
against its own rolling 7-day baseline, `getLineAnomaly` — ADR-022 —, a
persisted, baseline-persistence reliability forecast per line evaluated
against real outcomes once its target window passes,
`ReliabilityPrediction` — ADR-023 —, and a `SimulationProvider`
(`pnpm db:sync:simulation`) whose data is always tagged with a
"Simulated" UI badge, never blended silently with live data — ADR-024),
plus the target shape for later phases so the current design can be
checked against where it needs to go. See [Roadmap](#roadmap-phases-4-15)
for what's *not* built yet.

## System overview

```text
Transit Provider (DemoProvider + TflProvider today; GTFS-RT / Simulation later)
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
  getOccupancy?(stopExternalId: string, lineExternalId: string): Promise<ProviderOccupancy[]>;
}
```

`get*` methods return **provider-normalized** shapes (`Provider*` types) —
still provider-agnostic, but closer to "raw feed" concepts (external ids
present). These are validated by Zod schemas co-located in the same file,
so `DemoProvider` reading a fixture goes through the exact same validation
a TfL adapter's HTTP response would.

`getArrivals` / `getVehicles` / `getOccupancy` are optional on the
interface so it didn't need to change shape when a phase actually
implements one. `getArrivals` (Phase 5, ✅) and `getOccupancy` (Phase 9, ✅)
are both implemented on `DemoProvider` and `TflProvider` — see
`src/server/domain/live/get-stop-arrivals.ts` and `get-stop-occupancy.ts`
for how each is called (a live, non-persisted per-request read, not
ingestion; ADR-015/ADR-020). `getOccupancy`'s params were added when it
was actually implemented — TfL's real Crowding API is per (stop, line)
with no bulk form, so the original no-args stub was corrected rather than
kept. `getVehicles` remains unimplemented — no phase through 13 has
needed live vehicle positions, including `SimulationProvider` (ADR-024
scoped it to service-status scenarios only, reusing DemoProvider's
network rather than simulating vehicle movement).

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
  `Trip`, `Vehicle`, `ArrivalPrediction` (arrival-error specifically —
  deferred since Phase 7, ADR-018), `Disruption`,
  `User`/`Favourite`/`Alert`. These get added in the phase that actually
  needs them.
- **Deliberately never modeled as tables**: `Reliability` and `Occupancy`
  were both named in the original roadmap as future "entities," but
  Phases 8 and 9 computed them on demand instead (a time-weighted %
  from `ServiceStatus` history, and a live per-station call to TfL's
  Crowding API) rather than adding persisted tables — see DECISIONS.md
  ADR-019 and ADR-020 for why in each case.
- **The one exception: `ReliabilityPrediction` (Phase 12) is persisted.**
  Unlike Reliability/Occupancy/Anomaly, a prediction has to exist in the
  database *before* its outcome is known for "evaluated against actual
  outcomes" to mean anything — see DECISIONS.md ADR-023.

## PostgreSQL vs Redis

Phase 10 introduced Redis/BullMQ (ADR-002 deferred them until a phase
actually needed them; ADR-021 is that phase). The split:

- **PostgreSQL**: authoritative persisted history — providers, networks,
  lines, stops, historical arrivals/observations, disruptions, reliability
  aggregates, favourites.
- **Redis**: pub/sub for realtime fan-out (`service-status-updates`
  channel — published by `worker/index.ts`, relayed to the browser by
  `src/app/api/live/status/route.ts` over SSE) and the BullMQ job queue's
  own storage. Not used as a value cache yet — never the authoritative
  store for anything that needs to survive a restart.

## Data fetching / server-client boundary

Server Components read through `src/server/queries/*.ts` (thin, plain
async functions wrapping Prisma) — not raw Prisma calls scattered across
`page.tsx` files, and not React Query wrapping server-readable data. One
exception as of Phase 5: `queries/arrivals.ts` also calls
`src/server/domain/live/` for a live provider read (arrivals aren't
ingested — ADR-015) alongside its Prisma calls; the call-site convention
("pages read through `queries/*.ts`") still holds.

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
The `worker/index.ts` BullMQ worker (Phase 10, ADR-021) needs a
long-running host (Fly.io/AWS/a managed Redis) once deployed — Vercel's
serverless functions aren't suited to a long-lived queue consumer. The
SSE route (`src/app/api/live/status`) also needs a runtime that supports
long-lived streamed responses; not yet verified against Vercel's default
function timeout — worth checking once deployment is actually configured.

## Roadmap (Phases 4-15)

| Phase | Adds |
|---|---|
| 4 | ✅ `TflProvider` implementing `TransitProvider` against the real TfL Unified API |
| 5 | ✅ `getArrivals`, arrival boards, provenance on dynamic/observed data |
| 6 | ✅ Leaflet map layer over existing `lat`/`lon` (originally MapLibre — ADR-017) |
| 7 | ✅ Historical sampling of real observations — delay only; arrival error deferred (ADR-018) |
| 8 | ✅ Reliability methodology — time-weighted % good service, computed on demand (ADR-019) |
| 9 | ✅ Crowding source/confidence model — live per-station lookup of TfL's static data, not a persisted entity (ADR-020) |
| 10 | ✅ Redis, BullMQ sync workers, realtime status badges via SSE — no monorepo split needed (ADR-021) |
| 11 | ✅ Explainable anomaly detection — threshold deviation from a rolling baseline (ADR-022) |
| 12 | ✅ Reliability prediction (baseline persistence), evaluated against actual outcomes — arrival prediction still out of scope (ADR-023) |
| 13 | ✅ `SimulationProvider` implementing the same interface — explicit scenario, mandatory UI tag (ADR-024) |
| 14 | Auth (Better Auth or Clerk), `User`/`Favourite`, personalisation |
| 15 | Sentry, PostHog, accessibility/perf/security pass, production deployment |

Full detail lives in the project brief this repo was scoped from, not
duplicated here — this table exists so the current architecture's
extension points are visible at a glance.
