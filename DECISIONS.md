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
