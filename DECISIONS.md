# Architecture Decision Records

Each ADR: Context, Decision, Consequences, Status.

## ADR-001: Single Next.js app, not a monorepo

**Context.** The eventual system includes background workers (BullMQ,
Phase 10) that could live in a separate package.

**Decision.** Start as a single Next.js app at the repo root. No
Turborepo/Nx, no `apps/`+`packages/` split.

**Consequences.** Simpler tooling now; a real decision point arrives at
Phase 10 when a standalone worker process is needed — revisit then, with
actual constraints in hand instead of guessing.

**Status.** Accepted.

---

## ADR-002: No Redis/BullMQ until Phase 10

**Context.** The full product spec has legitimate future uses for both
(realtime pub/sub, background sync jobs).

**Decision.** Don't install them until a phase actually needs them.

**Consequences.** Phase 1-3 has no caching layer or job queue — acceptable,
since all data is either static demo fixtures or read directly from
Postgres via Server Components.

**Status.** Accepted.

---

## ADR-003: Self-referential `Stop` table instead of separate Station/Platform tables

**Context.** TfL's real `StopPoint` model is hierarchical (hub → station →
platform) via a `parentId`-style relationship, not separate entity types.

**Decision.** One `Stop` table with a `stopType` enum (`HUB` | `STATION` |
`PLATFORM`) and a self-referential `parentId`.

**Consequences.** The Phase 4 TfL adapter should map `StopPoint.stopType`
and its parent relationship directly onto this shape without a schema
change. The tradeoff: queries that want "stations only" must filter by
`stopType`, rather than querying a distinct table.

**Status.** Accepted.

---

## ADR-004: `ServiceStatus` is append-only, not fields on `Line`

**Context.** Later phases (7+) need historical reliability aggregation
over service status changes.

**Decision.** `ServiceStatus` is its own table; every ingestion run inserts
a new row rather than updating a `Line.currentStatus` field. Phase 1-3 UI
reads only the latest row per line.

**Consequences.** History accumulates automatically from Phase 1 onward —
no migration needed when Phase 7/8 wants to query it. A
`(lineId, source, recordedAt)` unique constraint keeps re-ingesting the
same provider snapshot from duplicating rows, while a genuinely new
`recordedAt` still appends.

**Status.** Accepted.

---

## ADR-005: Provenance via `(source, externalRef)` columns, not a mapping table

**Context.** Every dynamic/derived value should be traceable to the
provider that produced it (spec §57).

**Decision.** `source` (provider name) and `externalRef` (that provider's
own id) live as plain columns on `Line` and `Stop`, with a unique
constraint on the pair — not a separate `ProviderMapping` entity.

**Consequences.** Simplest form that still gives (a) idempotent upserts —
"has this externalRef from this source been seen before" is one indexed
lookup — and (b) traceability for debugging. A dedicated
provenance/`algorithmVersion` concept (spec §57-58) is deferred to the
phases that introduce derived metrics (reliability, prediction), where
"which algorithm version produced this row" actually matters.

**Status.** Accepted.

---

## ADR-006: Zod validation at every provider boundary, including the demo one

**Context.** The spec's core promise is "never fabricate transit data" —
that has to include never *trusting* malformed data uncritically, from any
source.

**Decision.** `DemoProvider` validates fixture JSON through the same Zod
schemas (`ProviderLineSchema`, etc.) that a real HTTP-based provider's
response would go through.

**Consequences.** A malformed fixture fails exactly like a malformed TfL
response would — this is deliberately exercised in
`tests/unit/providers/demo-provider.test.ts` (though see erratum below: the
test validates schema rejection directly rather than mutating fixture
files, to avoid shared-state flakiness across parallel test files).

**Status.** Accepted.

---

## ADR-007: Postgres `ILIKE` search now; pg_trgm/Elasticsearch later, with a stated trigger

**Context.** Search needs to work today; the spec explicitly warns against
adding Elasticsearch prematurely.

**Decision.** `ILIKE '%term%'` across `Stop.name`/`Line.name`, backed by a
plain B-tree index on `Stop.name`.

**Consequences.** Substring `ILIKE` won't use the B-tree index for
non-prefix matches, so this will degrade at real-world London-network
scale (thousands of stops) or if fuzzy/typo-tolerant matching is wanted.
**Upgrade trigger**: revisit with `pg_trgm` (trigram index) if/when stop
count grows materially past the current ~10-stop demo set, or if search
latency/relevance becomes a real UX complaint — not before.

**Status.** Accepted.

---

## ADR-008: Query layer over direct-Prisma-in-page and React-Query-everywhere

**Context.** Three ways to fetch data for Server Components: inline Prisma
calls per page, a shared query layer, or React Query for all server state.

**Decision.** A thin `src/server/queries/*.ts` layer of plain async
functions, called directly from Server Components. React Query is used
only for the one client-initiated post-mount fetch (search-as-you-type).

**Consequences.** Query logic (e.g. "latest service status per line") is
centralized and independently unit-testable, without wrapping the whole
app in a client-side cache that fights React Server Components. The rule
is stated explicitly in AGENTS.md so it isn't re-litigated file by file.

**Status.** Accepted.

---

## ADR-009: Biome over ESLint + Prettier

**Context.** `create-next-app` scaffolds ESLint by default.

**Decision.** Remove ESLint/`eslint-config-next`; use Biome for both
linting and formatting.

**Consequences.** One tool, one config file, faster. Loses some
Next.js-specific ESLint rules (e.g. certain App Router footguns) — accepted
tradeoff per the target stack.

**Status.** Accepted.

---

## ADR-010: UTC storage + `date-fns-tz` for Europe/London presentation

**Context.** All transport times need consistent timezone handling
(BST/GMT transitions, spec §55-56).

**Decision.** Store all timestamps as UTC (`TIMESTAMPTZ`); format via
`date-fns-tz` in a single wrapper module (`src/lib/time.ts`).

**Consequences.** `date-fns-tz` is lightweight and well-understood.
Temporal (the newer JS API) was considered but isn't yet stable enough
across Next.js's deployment targets to adopt now — revisit when it's a
non-experimental global. Late-night GTFS service-day parsing (spec §56)
isn't relevant yet since no GTFS static feed is integrated in Phase 1-3.

**Status.** Accepted.

---

## ADR-011: React Hook Form installed ahead of an actual form

**Context.** The spec's fixed target stack lists React Hook Form. Phase
1-3 has no auth, no form-driven feature (search is a single controlled
input, not a form).

**Decision.** Install it now per the target stack, but leave it unwired.

**Consequences.** This is a deliberate, called-out exception to "justify
every dependency against an actual need" — flagged here rather than
silently included. **Revisit trigger**: if Phase 14 (personalisation) or
any earlier phase doesn't end up needing a real form, reconsider whether
this dependency should be removed instead of carried forward indefinitely.

**Status.** Accepted (flagged for revisit).

---

## ADR-012: Prisma 7 (stable) over the 8.0.0-rc line

**Context.** At scaffold time, `prisma@latest` via a transitive dependency
path resolved to `8.0.0-rc.13`, which pulled in `@prisma/composer-cli` →
`alchemy` → Cloudflare `workerd` — a large, unrelated runtime dependency
chain with no purpose in this project.

**Decision.** Pin `prisma`/`@prisma/client` to the `7.x` stable line
explicitly.

**Consequences.** Avoids the `workerd`/`alchemy` dependency bloat entirely.
Prisma 7's client generator (`prisma-client`, not the legacy
`prisma-client-js`) requires an explicit driver adapter
(`@prisma/adapter-pg`) — there is no more implicit connection from
`datasource.url`; `src/server/db/client.ts` constructs the adapter from
`process.env.DATABASE_URL` directly. Revisit the 8.x line once it reaches
stable and once/if the composer/agent-skills tooling it bundles is
actually wanted.

**Status.** Accepted.

---

## ADR-013: `prisma init` scaffolds AI-agent "skills" directories — removed

**Context.** Prisma 7's `prisma init` automatically created
`.claude/skills/`, `.agents/skills/`, `.windsurf/skills/`, and
`skills-lock.json` in the repo root, unasked.

**Decision.** Deleted immediately after scaffold. Not part of this
project's tooling.

**Consequences.** None — purely a note for future maintainers who run
`prisma init` again and are surprised by the same files reappearing.

**Status.** Accepted.

---

## ADR-014: TflProvider (Phase 4) scoping decisions

**Context.** `TflProvider` is the first real `TransitProvider` implementation,
against TfL's live Unified API. Several shapes needed judgment calls the
demo fixtures never forced.

**Decisions.**

- **Rail modes only, bus excluded, configurable.** Default modes are
  `tube, overground, elizabeth-line, dlr, tram`. TfL's bus network is
  ~700 routes / thousands of stops — it would dwarf the rail network this
  phase targets and isn't needed by any Phase 1-9 feature. **Revisit
  trigger**: a feature that specifically needs bus data.
- **No line colour.** TfL's API doesn't return branding colour for a line.
  Rather than hardcode the well-known hex values (risking staleness after
  a rebrand, as happened to Overground in 2024 — it now has six named
  lines: Liberty, Lioness, Mildmay, Suffragette, Weaver, Windrush, each its
  own `Line` row), `ProviderLine.color` is left unset for every TfL line.
- **Stop sequence via `/Line/{id}/Route/Sequence/outbound`, not
  `/Line/{id}/StopPoints`.** The latter doesn't guarantee stop order; the
  former returns each line's branches as ordered arrays, used directly as
  `LineStop.sequence`. Only `outbound` is fetched (not `inbound`) — for the
  standard two-way lines this project ingests, outbound already covers the
  full physical route including every branch. Sequence numbers restart per
  branch rather than forming one global order across a branched line's
  branches — acceptable since `sequence` is display ordering, not a
  reliability input.
- **Hub resolution via individual, concurrency-limited `/StopPoint/{id}`
  lookups, not the batched `/StopPoint/{ids}` form.** A station that's
  part of a hub (`stopType: "TransportInterchange"` in TfL's model)
  appears in `Route/Sequence` only as a `parentId` reference, not as its
  own record — every distinct `parentId` seen needs its own `HUB`-type
  `Stop` row, otherwise `ingestStops` throws `IngestionError` trying to
  resolve a parent that doesn't exist as a row (see ADR-003's hierarchy).
  Two problems ruled out the obvious batched approach, found by testing
  against the live API while building this (not from documentation): (1)
  `/StopPoint/{ids}` 400s once too many ids are joined — the cutoff is
  undocumented but sits somewhere between 30 and 40; (2) more importantly,
  looking up a *station-level* id that's part of a hub (e.g.
  `910GBUSHEY`, Bushey mainline station) returns the hub's own canonical
  id in the response body (`HUBBSH`), not the id that was requested — and
  a batch response's entries can't be reliably matched back to which
  requested id produced them. So each hub id is looked up individually
  (10 at a time) and stored under the id that was actually requested,
  ignoring whatever id the response claims for itself. No `PLATFORM`-level
  granularity is modelled in Phase 4 (that needs yet another per-stop
  call) — every TfL stop ingested this phase is `STATION` or `HUB`.
- **Status severity mapping bucketed from TfL's real ~21-value vocabulary
  (confirmed via `/Line/Meta/Severity` for the five configured modes, not
  guessed) into the existing 7-value `ServiceStatusLevel` enum** — e.g.
  `"Closed"`/`"Not Running"`/`"No Service"` -> `SUSPENDED`, `"No Step Free
  Access"`/`"Information"`/`"No Issues"` -> `GOOD_SERVICE`, `"Bus
  Service"` -> `SPECIAL_SERVICE`. The original TfL label is preserved
  verbatim in `ServiceStatus.description`'s source text (via `reason`), so
  the bucketing loses no information, only precision in the stored enum.
  `normalizeServiceStatus` still throws `NormalizationError` (not a silent
  `UNKNOWN` fallback) for any label outside this known vocabulary — a
  genuinely new TfL status should fail ingestion loudly, not be guessed at.
- **`recordedAt` uses the disruption's `validityPeriods[0].fromDate`** when
  present (when the status actually became true), falling back to the
  sync's own request time only for statuses with no validity period (e.g.
  "Good Service", which has none) — never a fabricated timestamp.

**Consequences.** `pnpm db:sync:tfl` (mirroring `prisma/seed.ts`, per
AGENTS.md's provider-boundary rule) ingests the real London rail network
through the exact same `ingestLines`/`ingestStops`/`ingestServiceStatus`
pipeline the demo data uses, unchanged. `TflProvider`'s own unit test
(`tests/unit/providers/tfl-provider.test.ts`) mocks `fetch` against fixtures
shaped like verified real API responses rather than hitting the network,
so it's fast and doesn't require a key in CI.

**Status.** Accepted.

---

## ADR-015: `src/server/domain/live/` — a second, narrower provider-boundary exception for live reads

**Context.** Phase 5 adds arrival boards. AGENTS.md's provider boundary
rule (written for Phase 1-3, before arrivals existed) says only
`src/server/domain/ingestion/*` and `prisma/seed.ts` (or a future sync
job) may import a concrete provider (`DemoProvider`/`TflProvider`) — every
existing case is batch fetch-normalize-persist into Postgres. Arrivals
don't fit: a prediction is seconds-old by the time it'd be read back, so
persisting it would just be a slower, staler cache than calling the
provider directly on each request — there is deliberately no
`ArrivalPrediction` table (see ARCHITECTURE.md's schema-omission list).

**Decision.** Add `src/server/domain/live/` as a second sanctioned
concrete-provider touchpoint, alongside ingestion/seed, scoped narrowly to
non-persisted per-request reads:

- `provider-registry.ts` — `getProviderForSource(source)`, a small factory
  keyed on `Stop.source`/`Line.source` (always a value already in
  Postgres, never user input — an unrecognized source means data was
  ingested by a provider this registry hasn't been told about, so it
  throws rather than guessing).
- `get-stop-arrivals.ts` — calls `provider.getArrivals`, normalizes via
  the same `normalizeArrival` ingestion's normalizers use, returns
  `DomainArrival[]` only. The app/queries layer still never sees a
  `Provider*` type or a concrete provider class — the boundary AGENTS.md
  cares about (no leaked provider shapes) holds; only the *location*
  allowed to construct a provider instance gains a second entry.

AGENTS.md's provider boundary section is updated to name this file
explicitly, so it stays the authoritative list rather than silently
diverging from it.

**Consequences.** `src/server/queries/arrivals.ts` (`getArrivalBoard`) is
the first file in `queries/` that isn't pure Prisma (ADR-008 described
every prior query that way) — it calls `get-stop-arrivals.ts` for the live
prediction, then Prisma to resolve the arrival's `lineExternalRef` against
the already-ingested `Line` row for display (name/colour). The
Server-Component call-site convention ("pages read through
`queries/*.ts`") holds; only the *implementation* is now sometimes hybrid.
A live call can fail (network, an unrecognized source, a provider that
doesn't implement `getArrivals`) — `getArrivalBoard` catches this and
returns `{ unavailable: true, rows: [] }` rather than letting the page
500 or rendering an empty board that looks like "confirmed no arrivals"
(AGENTS.md: never fabricate — say so in the UI).

**Status.** Accepted.

---

## ADR-016: MapLibre GL JS + OpenFreeMap for the Phase 6 network map

**Context.** The roadmap names "MapLibre/Mapbox" as the Phase 6 map layer
(ARCHITECTURE.md). Mapbox GL JS requires a Mapbox account and an access
token (and bills per map load past a free tier); MapLibre GL JS is the
open-source fork with an identical API, no account, no token.

**Decision.**

- **MapLibre GL JS** (`maplibre-gl`), not Mapbox GL JS — no token to
  provision or document as a required env var, no per-load billing risk
  for a portfolio project with no traffic controls.
- **Tiles from OpenFreeMap** (`tiles.openfreemap.org/styles/positron`) —
  a free, no-API-key vector tile host, chosen over the bare MapLibre demo
  style (`demotiles.maplibre.org`, intentionally coarse/for testing only)
  because it's an actual usable basemap. **Revisit trigger**: self-host
  tiles (OpenFreeMap publishes the full pipeline) if this project ever
  needs an SLA OpenFreeMap doesn't offer, or the free tier's usage
  expectations stop fitting.
- **One `NetworkMap` component, two call sites.** `/map` plots every
  `STATION`/`HUB` stop with coordinates (`getMapStops`); the station
  detail page passes it a single-stop array as a "where is this" embed
  (`maxZoom` capped tighter for the single-point case). No separate
  "mini map" component — `fitBounds` over one point behaves fine.
- **Marker colour = the stop's first associated line's colour**, not a
  separate mode-colour palette — reuses the same per-line brand colours
  `LineBadge` already shows elsewhere (`Line.color`, already in Postgres)
  rather than inventing new mapping logic. A stop with several lines
  shows only one colour; picking a "true" multi-line marker style (split
  pin, cluster ring) is deferred until it's an actual complaint, not
  designed for speculatively.
- **No `next/dynamic(..., { ssr: false })` wrapper.** `maplibre-gl`'s
  `Map` is only ever constructed inside `useEffect` (client-only by
  construction — SSR never runs effects), and the module import itself
  doesn't touch `window`/`document` at the top level, so plain `"use
  client"` + `useEffect` is sufficient; verified no SSR crash against the
  actual dev server before deciding this, not assumed.

**Consequences.** `pnpm add maplibre-gl` is the first "map library"
dependency this project installs — AGENTS.md's dependency policy explicitly
named this as premature before Phase 6; it's no longer premature.
`NetworkMap`'s own unit test (`tests/components/network-map.test.tsx`)
mocks the whole `maplibre-gl` module (jsdom has no WebGL) and asserts the
component wires stop data into the right constructor calls — it does not,
and cannot, prove WebGL tiles actually paint. That was verified manually:
in this development environment's automated browser tooling, MapLibre's
*own* official hosted demo page (not just this project's code) also
renders a blank canvas — a known limitation of that specific automation
tooling's WebGL/screenshot path, not a defect here. Marker placement,
correct colours, style/tile fetches (200, real vector tile bytes), and
zero console errors were all confirmed directly; actual tile painting
should be spot-checked in a normal browser.

**Status.** Superseded by ADR-017 — the WebGL assumption above turned out
to be wrong in normal browser use, not just an automation-tooling artifact.

---

## ADR-017: Leaflet + raster tiles, replacing MapLibre GL JS

**Context.** ADR-016 assumed MapLibre's blank-canvas symptom seen in this
development environment's browser automation was specific to that
automation tooling, to be "spot-checked in a normal browser" later. That
check happened: in a real, fully-updated Chrome on macOS, `/map` rendered
markers (DOM-positioned, no WebGL needed) but never painted basemap tiles.
`chrome://gpu` initially reported WebGL as hardware-accelerated, but
toggling the Skia Graphite rendering backend off surfaced MapLibre's own
runtime check throwing `GPUInitializationError: WebGL2 is required`,
confirming actual WebGL2 context creation was failing in this browser
session — not a network, CORS, CSP, or extension issue (all independently
ruled out; OpenFreeMap's style/tile endpoints returned 200 with correct
CORS headers throughout). Reverting the flag returned to the original
silent failure rather than fixing it.

**Decision.**

- **Leaflet**, not MapLibre GL JS — draws raster tile images via plain
  `<img>`/Canvas2D, no WebGL dependency at all. WebGL2 unavailability
  isn't unique to one misbehaving machine; it's a real constraint for some
  share of any public map feature's visitors (older hardware, some
  corporate/VM setups, browsers with WebGL disabled), so this is a
  compatibility improvement, not just a workaround for one dev environment.
- **Tiles from the standard OpenStreetMap raster endpoint**
  (`tile.openstreetmap.org`) — the no-signup default Leaflet's own docs
  use. CARTO's Positron raster tiles were tried first (closest visual match
  to the OpenFreeMap style ADR-016 chose) but now return an "API key
  required" watermark even for light anonymous use, failing ADR-016's
  no-API-key requirement. **Revisit trigger**: same as ADR-016 — self-host
  or move to a paid tile provider if traffic ever needs an SLA the OSM
  tile usage policy doesn't cover.
- **Runtime `import("leaflet")` inside `useEffect`, not a top-level
  import.** Unlike `maplibre-gl`, Leaflet's module touches `window` at
  import time, which crashes the client component's SSR pass
  (`ReferenceError: window is not defined`) if imported statically.
  Deferring the import to inside the effect keeps this one component with
  no `next/dynamic(..., { ssr: false })` wrapper, preserving ADR-016's
  original reasoning for that call — just moved from "module import" to
  "module import, deferred to the browser".
- **Marker colour via a coloured SVG `divIcon`**, not Leaflet's default
  marker image — the bundled default marker is a fixed blue PNG that can't
  be recoloured per-line without shipping one image per line colour or
  fighting bundler asset paths. Same per-line colour behaviour as before
  (`Line.color`, falling back to `#6b7280`).
- Component API (`stops`, `className`, `maxZoom`) is unchanged, so both
  call sites (`/map`, station detail page embed) needed no edits.

**Consequences.** `maplibre-gl` removed, `leaflet` + `@types/leaflet`
added. `tests/components/network-map.test.tsx` now mocks `leaflet` instead
and awaits a microtask tick before asserting, since the dynamic import
resolves asynchronously. Verified in a real browser (not just automation
tooling) that tiles, roads, and labels now paint correctly with no API-key
watermark.

**Status.** Accepted.

---

## ADR-018: Phase 7 status-history sampling — delay only, reusing `ServiceStatus`, no scheduler

**Context.** The roadmap scopes Phase 7 as "historical sampling of real
observations (delay, arrival error)." Arrival error would mean measuring
predicted-vs-actual arrival time, but TfL's live API only ever returns
predictions — it never confirms an arrival happened. The only way to infer
"actual" would be polling the same stop repeatedly and treating a specific
vehicle's countdown disappearing (or hitting ~0) as a proxy for arrival,
which is an *inferred* value bounded by poll interval, not a measured one.
Building that honestly — with its own labelled confidence, distinct from
real measured data (this project's non-negotiable "never fabricate
realtime values" rule) — is a bigger design decision than fits this phase,
so it's deferred rather than shipped half-considered.

**Decision.**

- **Delay only for Phase 7.** Arrival-error inference is explicitly
  deferred, not forgotten — revisit once there's a concrete, honest way to
  label an inferred actual-arrival time's confidence.
- **No new table.** `ServiceStatus` was already designed append-only from
  Phase 1 specifically so "later reliability phases get historical data
  for free, without a migration" (ADR-004). Phase 7 is exactly that later
  phase: it turns the existing table into a real growing history by
  running the existing `ingestServiceStatus` on a recurring cadence,
  rather than inventing an `Observation`/`StatusSample` table that would
  just duplicate it.
- **Dedup fix in `ingestServiceStatus` itself**
  (`src/server/domain/ingestion/ingest-service-status.ts`): before
  upserting, it now checks the most recently recorded row for that
  `(lineId, source)` and skips writing if the status/description are
  unchanged, regardless of `recordedAt`. Needed because
  `TflProvider.getServiceStatus()` derives `recordedAt` from TfL's own
  `validityPeriod` when present, but falls back to poll-time
  (`new Date().toISOString()`) when TfL omits one — which is the common
  case for routine "Good Service." Without this fix, polling an
  undisrupted line every few minutes would append a new near-duplicate row
  per poll forever (since `recordedAt` differs each time and is part of
  the row's uniqueness key), turning one continuous period of good service
  into hundreds of rows and corrupting the exact history Phase 8's
  reliability methodology will aggregate. This also retroactively benefits
  `db:sync:tfl`, which had the same latent issue whenever re-run by hand.
- **`prisma/sample-status.ts` (`pnpm db:sample:tfl`), a separate script
  from `db:sync:tfl`**, not a flag on it — `db:sync:tfl` establishes
  network structure (lines/stops), meant to run rarely; this only calls
  `ingestServiceStatus`, meant to run frequently. Mixing both concerns into
  one script would make its "safe to run repeatedly" framing ambiguous. It
  requires TfL lines to already exist (`ingestServiceStatus` already throws
  a clear `IngestionError` otherwise) — no new error handling needed.
- **Still a manual/cron-invoked script, not a scheduled job.** ADR-002
  defers Redis/BullMQ to Phase 10; this follows the exact precedent
  `db:sync:tfl` already set ("safe to run repeatedly by hand while there's
  no scheduler yet"). A developer runs it by hand or from a local
  cron/launchd entry; Phase 10 replaces this with a real background
  worker.
- **No query layer or UI for this history yet.** Phase 8 ("Reliability
  methodology, baselines, `Reliability` entity") owns turning raw
  `ServiceStatus` history into anything a page reads — this phase is data
  collection only.

**Consequences.** No schema change, no migration, no new dependency. The
`ingest-service-status.ts` dedup change is a behavioural change to
existing ingestion logic, covered by a new test case in
`tests/unit/domain/ingestion/ingest-service-status.test.ts` (a synthetic
`TransitProvider` polling the same status with a different `recordedAt`
each call, asserting no duplicate row is appended).

**Status.** Accepted.

---

## ADR-019: Reliability methodology — time-weighted % good service, computed on demand

**Context.** Phase 7 (ADR-018) made `ServiceStatus` a genuine, deduped
history of real status transitions per line. Phase 8 is the first phase
that turns that into an actual reliability figure — the roadmap names it
"Reliability methodology, baselines, `Reliability` entity," but no
external project brief specifies the formula (confirmed with the user), so
it's designed here from what's actually measurable.

**Decision.**

- **Formula: time-weighted % of a window spent in `GOOD_SERVICE`**, from
  the real gaps between recorded transitions
  (`src/server/domain/reliability/calculate-reliability.ts`) — not a
  weighted score across severity levels (the weights would be a subjective
  judgment call with no basis yet) and not a raw incident count (loses how
  long each disruption actually lasted). This is the simplest figure that
  matches what `ServiceStatus` actually records.
- **Never extrapolate before the first real observation.** If a 7-day
  window is requested but a line only has 3 hours of history (true right
  after this phase ships), the honest answer is "100% based on 3 hours,"
  not a fabricated 7-day figure — the project's non-negotiable "never
  fabricate realtime values" rule applies here just as much as to live
  data. `calculateReliability` returns the actual `coverageStart` used
  (clamped to the earliest real observation, never before it), and
  `src/components/network/reliability-summary.tsx` discloses this in the
  UI ("Based on N hours/days of data since...") whenever coverage is less
  than the full requested window, rather than hiding the caveat.
- **Computed on demand at query time** (`src/server/queries/reliability.ts`
  `getLineReliability`), not a persisted `Reliability` table. Per-line
  `ServiceStatus` row counts stay small (Phase 7's dedup means only real
  transitions get rows), so live aggregation over a 7-day window is cheap.
  A persisted table would need its own periodic recomputation job — the
  same staleness/scheduling problem Phase 7 already navigated around, and
  ADR-002 defers real background jobs to Phase 10. The literal "Reliability
  entity" from the roadmap is satisfied as a well-typed domain/query-layer
  concept (`ReliabilityResult`, `LineReliability`), not necessarily a
  Postgres table — revisit if a later phase needs to query reliability
  across many lines at once cheaply (a real aggregate/materialized-view use
  case), rather than one line at a time as today.
- **`algorithmVersion` on every computed result**, satisfying ADR-005's
  forward-looking note that derived-metric phases would need a way to tell
  "which algorithm version produced this row" — here, "this value." Bumped
  via `RELIABILITY_ALGORITHM_VERSION` in `calculate-reliability.ts`.
- **7-day window.** Short enough that real data accumulates within days of
  shipping (rather than requiring a 30-day wait before showing anything
  meaningful), and matches how "weekly reliability" is commonly framed for
  transit services.
- **UI**: a `ReliabilitySummary` card on the line detail page
  (`src/app/lines/[lineId]/page.tsx`), between the existing status card and
  the stations list. Kept as its own component (not inlined in the page)
  specifically so its branching display logic — percent, coverage
  disclosure, "not enough data" — is unit-testable via RTL without a
  database.

**This is now a reliability algorithm, so AGENTS.md's non-negotiable rule
applies going forward**: any future change to `calculateReliability`'s
formula must bump `RELIABILITY_ALGORITHM_VERSION`, come with tests, and get
a DECISIONS.md entry (a new ADR, not a silent edit to this one).

**Consequences.** No Prisma schema change, no migration, no new
dependency. New files: `src/server/domain/reliability/calculate-reliability.ts`
(pure function, unit-tested with no DB —
`tests/unit/domain/reliability/calculate-reliability.test.ts`),
`src/server/queries/reliability.ts` (`getLineReliability`, integration
-tested against the real test DB —
`tests/unit/server/queries/reliability.test.ts`), and
`src/components/network/reliability-summary.tsx` (RTL-tested —
`tests/components/reliability-summary.test.tsx`).

**Status.** Accepted.

---

## ADR-020: Occupancy — live per-station lookup of TfL's static crowding data, never presented as measured

**Context.** The roadmap names Phase 9 as "`Occupancy` entity,
`getOccupancy`, crowding source/confidence model." AGENTS.md's
non-negotiable rule: "Never treat estimated/simulated crowding as official
measured occupancy. Every crowding value must carry a source/confidence
field." Before designing anything, TfL's actual public Swagger spec was
checked (not assumed): the only Crowding endpoint,
`/StopPoint/{id}/Crowding/{line}?direction=...`, is documented as
returning **static** data — a `trainLoadings` array of `{timeSlice:
"HHMM-HHMM", value: 1-6}` (1 = Very quiet, 6 = Exceptionally busy),
i.e. typical crowding by time-of-day, not live per-train occupancy. There
is no bulk "all stops" form of this endpoint — it's strictly per
(station, line).

**The Swagger spec turned out to be an incomplete guide to the real
response** — caught by testing against the live API with a real
`TFL_APP_KEY`, not just the fixture-based provider tests, which initially
showed every station's crowding as "Not available" even for stations that
plainly have data:

1. The real response is a **single StopPoint object** whose `lines` array
   carries a `crowding.trainLoadings` entry per line (only the requested
   line's entry is populated) — not an array of StopPoint objects as the
   Swagger schema declares. `TflCrowdingRawSchema` in `tfl-client.ts`
   matches the real shape; `TflProvider.getOccupancy` finds the matching
   line by `id` rather than assuming array position.
2. `direction=all` does not merge inbound/outbound — it returns **two
   separate entries per time slice**, one per direction. `getCurrentOccupancy`
   averages (rounded) every entry matching the current time slice instead
   of picking one direction arbitrarily.
3. `value` can be **0**, despite the docs only stating a 1-6 scale, and
   its real meaning isn't documented anywhere found. Rather than guess
   (e.g. "0 = no service" or folding it into "Very quiet"),
   `getCurrentOccupancy` excludes level-0 entries before averaging —
   treated as "no reading," honestly falling through to `null`
   ("not available") if nothing else covers that slice. `level`'s schema
   bound widened to `0-6` so a real response isn't rejected outright.

This is the concrete lesson: a Swagger spec (even TfL's own) describes
what an API is *supposed* to return, not proof of what it actually
returns — verify against a live call before shipping, not just against
hand-built fixtures that encode the same assumption the spec did.

**Decision.**

- **Live per-station lookup, not bulk ingestion.** `getOccupancy` is
  called on demand, once per line serving a station, when that station's
  page is viewed — extending the same "live, non-persisted per-request
  read" pattern ADR-015 established for arrivals
  (`src/server/domain/live/get-stop-occupancy.ts`, alongside
  `get-stop-arrivals.ts`) to a second data type. Rejected bulk-ingesting a
  new `Occupancy` table across the ~600 already-synced TfL stations: there
  is no bulk endpoint to ingest from (it would mean one API call per
  (stop, line) pair — hundreds to over a thousand), and TfL's real-world
  coverage of this data across every station/mode (especially DLR,
  Overground, Tram) is unknown and likely partial, making a large,
  slow, failure-prone ingestion job a poor trade for uncertain benefit. A
  per-line try/catch in `getStationOccupancy`
  (`src/server/queries/occupancy.ts`) means one line lacking data — a
  real, expected outcome — never breaks the others.
- **Changed the pre-existing `getOccupancy?(): Promise<ProviderOccupancy[]>`
  stub to `getOccupancy?(stopExternalId, lineExternalId):
  Promise<ProviderOccupancy[]>`.** The old no-args shape assumed a bulk
  endpoint that doesn't exist. Safe to change: nothing depended on the old
  shape (the only two references were tests asserting it was `undefined`
  on both providers), so this corrects a pre-implementation stub to match
  the real API rather than breaking a real caller.
- **Kept TfL's own 1-6 qualitative scale as-is**
  (`CROWDING_LEVEL_LABELS` in
  `src/server/domain/occupancy/current-occupancy.ts`), not converted to a
  percentage. "Fairly busy" is what TfL actually reports; a specific %
  figure for that bucket would be a number TransitPulse invented, not
  data TfL provides — the concrete instantiation of the non-negotiable
  crowding rule above.
- **Every computed value carries `confidence: "typical"` and `source`**
  (`CurrentOccupancy`) — literal, not a range, since this is always
  historical/typical data from this single methodology today. The UI
  (`OccupancySummary`) makes this explicit ("Typical for this time (TfL
  historical data)") rather than presenting a bare number.
- **`getCurrentOccupancy` never guesses a nearby slice** — a London-local
  "HHmm" (from `formatLondonTime(now, "HHmm")`, the only new caller of
  that formatter — no new `date-fns-tz` import, per ADR-010) is floored to
  its 15-minute bucket and matched exactly; no match means an honest
  `null` ("not available"), not an approximation from an adjacent slice.
- **UI**: `OccupancySummary` replaces the Phase 1-3 placeholder on
  `src/app/stations/[stationId]/page.tsx` ("Crowding and reliability
  metrics for this station arrive in later phases").

**Consequences.** No Prisma schema change, no migration, no new
dependency. New files: `src/server/domain/occupancy/current-occupancy.ts`
(pure, unit-tested —
`tests/unit/domain/occupancy/current-occupancy.test.ts`),
`src/server/domain/live/get-stop-occupancy.ts`,
`src/server/queries/occupancy.ts` (integration-tested —
`tests/unit/server/queries/occupancy.test.ts`), and
`src/components/network/occupancy-summary.tsx` (RTL-tested —
`tests/components/occupancy-summary.test.tsx`). `ProviderOccupancySchema`
redefined to match TfL's real shape; `TflProvider`/`DemoProvider` both now
implement `getOccupancy` (existing "does not implement vehicles/occupancy"
tests updated accordingly — `getVehicles` is still unimplemented,
reserved for Phase 10).

**Status.** Accepted.

---

## ADR-021: Redis, BullMQ worker (single package), realtime status badges via SSE

**Context.** The roadmap names Phase 10 as "Redis, BullMQ sync workers,
realtime broadcast — worker/monorepo split decided here." ADR-001
explicitly deferred the monorepo question to this phase ("a real decision
point arrives at Phase 10... revisit then, with actual constraints in
hand"); ADR-002 deferred installing Redis/BullMQ to this phase. Two
scripts already existed as stand-ins for exactly this
(`prisma/sync-tfl.ts`, `prisma/sample-status.ts`), each with a comment
saying so.

**Decision.**

- **No monorepo — the worker is a second `tsx` entrypoint**
  (`worker/index.ts`, `pnpm worker`) in the same package, reusing
  `src/server/*` directly (same Prisma client, same `ingestLines`/
  `ingestStops`/`ingestServiceStatus`). It needs the same dependency
  graph as the Next.js app, not an isolated one, so `apps/web` +
  `apps/worker` would be pure restructuring overhead for no real
  benefit. This closes ADR-001's open question.
- **Two BullMQ jobs on one queue** (`transitpulse-sync`), replacing the
  two manual scripts: `sync-tfl` (full `ingestLines`/`ingestStops`/
  `ingestServiceStatus`, every 6 hours — structural data changes rarely)
  and `sample-status` (`ingestServiceStatus` only, every 2 minutes —
  the cadence Phase 7's `db:sample:tfl` was always meant to run at once a
  scheduler existed). Scheduled via `Queue.upsertJobScheduler` (BullMQ
  v6's API — `Queue.add({ repeat })` was removed in v6), which is
  idempotent by `jobSchedulerId`, so restarting the worker never
  duplicates the schedule.
- **`ingestServiceStatus` now returns `ServiceStatusChange[]`** (was
  `Promise<void>`) — the rows it actually wrote, keyed by the internal
  `Line.id`. Safe to change: nothing depended on the old `void` return
  (both existing callers already ignored it). The worker publishes every
  returned change to Redis; no new "did anything change" logic needed
  outside the ingestion function that already knows.
- **A real bug found while adding this**: two existing tests
  (`tests/unit/server/queries/reliability.test.ts`'s window-calculation
  test, and `ingest-service-status.test.ts`'s "polling noise" test) each
  insert a synthetic `ServiceStatus` row with a `recordedAt` that ends up
  later than real wall-clock time (one deliberately 7+ days in the
  future, the other real-`Date.now()`-based). Neither cleaned up after
  itself. Because `ingestServiceStatus`'s dedup check picks "latest" via
  `orderBy: recordedAt desc`, either leftover row permanently outranks
  that line's real fixture data in the shared, persistent test DB —
  breaking dedup for every later test reusing that line, invisibly,
  because no earlier test asserted on `ingestServiceStatus`'s return
  value (only row counts, which stayed stable regardless). Both tests
  now clean up their synthetic rows in `afterAll`. This wasn't a
  production bug (real TfL data is never future-dated), but it's a real
  shared-test-DB hygiene gap worth naming: a synthetic row with a
  timestamp that isn't genuinely "now" needs to be cleaned up, not left
  for the next test to trip over.
- **Realtime transport: Server-Sent Events, not WebSockets**
  (`src/app/api/live/status/route.ts`). This is strictly server→client
  (status changes push out; the client never sends anything back), and
  SSE is a plain streamed Route Handler response — no custom server,
  consistent with the "no monorepo / stay in Next.js's normal server
  model" decision above. The route opens its own dedicated Redis
  subscriber connection (pub/sub needs one not shared with other
  commands) and disconnects it on the request's `abort` signal.
- **Zustand as the live-override store**
  (`src/lib/live-status-store.ts`) — installed since Phase 1-3,
  explicitly "unwired until a real use case exists" (README stack
  table). This is that use case: a `useLiveServiceStatus(lineId,
  initial)` hook returns an SSE-delivered override if one has arrived
  this session, else the server-rendered `initial` values. `LineCard`
  (network overview + lines list) and a new `LineStatusCard` (extracted
  from the line detail page, same pattern as `ReliabilitySummary` in
  Phase 8) both use it — no other component needed converting to a
  client component.
- **Scope boundary**: live updates cover per-line status badges and
  their timestamps only. The network overview's aggregate `SummaryStat`
  tiles (counts of good-service/minor-delay/severe lines) are **not**
  wired live this phase — real, separate work, left for when it's
  actually asked for.
- **Caveat, not a blocker**: long-lived SSE connections have known
  limitations on some serverless hosts (e.g. Vercel's default function
  timeout). Not a concern now — deployment isn't configured yet
  (ARCHITECTURE.md) — but worth revisiting once it is.

**Consequences.** New dependencies: `bullmq`, `ioredis`. New required env
var `REDIS_URL` (same treatment as `DATABASE_URL` — no default). New
`redis` service in `docker-compose.yml`. CI gets `REDIS_URL` as a plain
env value (no new CI service — nothing in typecheck/lint/test/build opens
a Redis connection; the worker and SSE route are verified manually,
matching the precedent already set for MapLibre/browser-only checks in
ADR-017). Verified end-to-end manually: `pnpm worker` against real TfL
data successfully ran both jobs and published real changes; a message
published directly to the `service-status-updates` Redis channel
live-patched an open line detail page's status badge in a real browser
with no refresh.

**Status.** Accepted.

---

## ADR-022: Explainable anomaly detection — threshold deviation from a rolling baseline, not a statistical model

**Context.** The roadmap names Phase 11 as "Explainable anomaly detection
(deviation from rolling baseline)." "Explainable" is the operative word —
whatever flags an anomaly needs to show its work, not just assert one.

**Decision.**

- **Reuse `calculateReliability` (ADR-019) for both windows being
  compared**, rather than writing new windowing/coverage logic:
  `getLineAnomaly` (`src/server/queries/anomaly.ts`) computes a line's
  last-24h reliability ("recent") and its prior-7-days reliability
  ("baseline", the 7 days immediately before the recent window, not
  overlapping it), then hands both `ReliabilityResult`s to a pure
  `detectAnomaly` function.
- **Threshold-based, not statistical.** An anomaly fires when
  `baseline% - recent% >= 15 points` and the recent window has at least
  2 hours of real coverage (so a handful of minutes of data can't trigger
  a false alarm). No z-scores, no learned model — "explainable" here
  means the explanation *is* the two numbers being compared
  (`src/server/domain/anomaly/detect-anomaly.ts`'s `explanation` string),
  not a black box a reader has to trust.
- **Computed on demand**, same reasoning as ADR-019/ADR-020: no new
  table, no background job — cheap to compute from the same
  `ServiceStatus` rows Phase 8 already reads.
- **`ANOMALY_ALGORITHM_VERSION`**, same convention as
  `RELIABILITY_ALGORITHM_VERSION` — this is now a second
  reliability-adjacent algorithm, so AGENTS.md's "never change
  reliability/prediction algorithms without tests and a DECISIONS.md
  entry" rule applies to it from here on.
- **UI**: a new `AnomalyBanner` renders only when an anomaly is actually
  detected — no "all clear" banner, no placeholder for missing data
  (that's `ReliabilitySummary`'s job already). Given how little real
  history exists at this point in the project, most lines will show
  nothing here for a while — that's the honest, expected state, not a
  bug.

**Consequences.** No schema change, no migration, no new dependency. New
files: `src/server/domain/anomaly/detect-anomaly.ts` (pure, unit-tested),
`src/server/queries/anomaly.ts` (integration-tested against the real test
DB), `src/components/network/anomaly-banner.tsx` (RTL-tested).

**Status.** Accepted.
