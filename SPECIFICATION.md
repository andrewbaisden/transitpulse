# Specification

Engineering scope for TransitPulse: what the product is for, where its data
comes from, the stack, and the phase-by-phase record of what has been built.

How to run the app is in [README.md](./README.md). System design is in
[ARCHITECTURE.md](./ARCHITECTURE.md). The decision log is in
[DECISIONS.md](./DECISIONS.md).

## Status

**Phases 1–15 of 15 are built.** A static network explorer with a real
`TflProvider` (`pnpm db:sync:tfl`) alongside the seeded demo data, live
arrival boards on each station page (fetched per request, not stored — see
DECISIONS.md ADR-015), an interactive Leaflet network map at `/map` plus a
per-station location embed (ADR-017), a time-weighted reliability figure per
line computed on demand from `ServiceStatus` history (ADR-019), a
per-station crowding section using TfL's real (static/historical, never
live) typical-crowding data, explicitly labelled as such (ADR-020), a
BullMQ worker (`pnpm worker`) publishing real status changes over Redis so
open pages live-patch their status badges via Server-Sent Events (ADR-021),
explainable, threshold-based anomaly detection comparing a line's last 24h
against its own 7-day baseline (ADR-022), a baseline-persistence reliability
forecast per line, evaluated against real outcomes once each target window
passes (ADR-023), a `SimulationProvider` for scenario testing
(`pnpm db:sync:simulation`), always shown with a "Simulated" tag so it is
never mistaken for live data (ADR-024), self-hosted auth (Better Auth) with
per-line/station favourites (ADR-025), and inert-by-default Sentry/PostHog
observability plus a security-headers/accessibility pass and documented
deployment target (ADR-026/ADR-027).

## Scope

TransitPulse is an AI-assisted engineering project demonstrating a real
provider-abstracted data platform: external ingestion, a provider-neutral
domain model, geospatial and realtime features, historical analytics, and
production engineering. It is a network intelligence view. It is not a
journey planner, and it does not fabricate transport data it does not
actually have.

Data provenance is a first-class concern throughout: every line, stop, and
status row is tagged with where it came from (`source` + `externalRef`), so
demo data, TfL data, and simulated data stay distinct.

## Data sources

Three providers implement the same `TransitProvider` interface and run
through the same ingestion pipeline. See [ARCHITECTURE.md](./ARCHITECTURE.md)
for that pipeline.

**Demo** (`tests/fixtures/demo/*.json`, loaded with `pnpm db:seed`). A small
realistic subset of the London network: Central, Jubilee, and Elizabeth
lines; Stratford, Liverpool Street, Bond Street, and a handful of other
stations, including one station/platform hierarchy pair. This is fixture
data for local development and tests.

**TfL** (`src/server/providers/tfl/`, loaded with `pnpm db:sync:tfl` or the
background worker). The live [TfL Unified API](https://api-portal.tfl.gov.uk).
Arrivals and typical crowding are read per request and are not stored. See
the roadmap below and DECISIONS.md ADR-014, ADR-015, and ADR-020.

**Simulation** (`pnpm db:sync:simulation`). An explicit, developer-supplied
disruption scenario. Every simulated line is its own `(source, externalRef)`
row, and the UI renders a "Simulated" tag wherever `source === "simulation"`.
See ADR-024.

## Tech stack

| Area                 | Choice                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework            | Next.js 16 (App Router), React 19, TypeScript (strict)                                                      |
| Styling              | Tailwind CSS v4, shadcn/ui (Radix)                                                                          |
| Validation           | Zod (provider boundary + env)                                                                               |
| Client state         | Zustand (live status overrides via SSE — see DECISIONS.md ADR-021)                                          |
| Server-fetched state | TanStack Query (search-as-you-type only)                                                                    |
| Forms                | React Hook Form (installed for the fixed target stack; unwired until a real form exists — see DECISIONS.md) |
| Database             | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)                                                                |
| Map                  | Leaflet + OpenStreetMap raster tiles (no API key — see DECISIONS.md ADR-017)                                |
| Jobs / realtime      | BullMQ + Redis, SSE for browser push (ADR-021)                                                              |
| Observability        | Sentry (`@sentry/nextjs`) + PostHog (`posthog-js`), both inert until real credentials are set (ADR-026)     |
| Lint/format          | Biome                                                                                                       |
| Git hooks            | Husky + lint-staged                                                                                         |
| Testing              | Vitest, React Testing Library, Playwright                                                                   |
| CI                   | GitHub Actions                                                                                              |

Redis and BullMQ were installed in Phase 10 (ADR-021). Better Auth
(self-hosted, not a third-party account provider) was installed in Phase 14
(ADR-025). Sentry and PostHog were installed in Phase 15, wired to no-op
with no DSN or key set (ADR-026). See [DECISIONS.md](./DECISIONS.md).

Local setup, environment variables, and how to run the app are in
[README.md](./README.md). The test database is covered in
[TESTING.md](./TESTING.md).

## Roadmap

Phases 1–3 build a static network explorer: foundation and tooling, the
internal transit domain and provider abstraction over demo data, and a basic
UI (network overview, lines, stations, search).

Phase 4 adds `TflProvider` (`src/server/providers/tfl/`), a real
`TransitProvider` implementation against the live TfL Unified API, and
`pnpm db:sync:tfl` to run it through the same ingestion pipeline the demo
data uses. See DECISIONS.md ADR-014 for the scoping decisions. The UI itself
is not wired to prefer or select a source yet — see the caution note in
`prisma/sync-tfl.ts`.

Phase 5 adds live arrival boards on each station page. `getArrivals` is
implemented on both `TflProvider` and `DemoProvider`, fetched fresh on every
request through `src/server/domain/live/` rather than ingested into Postgres.
Arrivals are seconds-old predictions, not structural network data — see
DECISIONS.md ADR-015. A failed live fetch shows an honest "not available"
state rather than an empty-looking board.

Phase 6 adds an interactive Leaflet network map at `/map` (`getMapStops` →
`NetworkMap`) plotting every station and hub with coordinates, plus a
per-station location embed on the station detail page — one component, two
call sites. No API key is required (OpenStreetMap raster tiles). See
DECISIONS.md ADR-016 (original MapLibre GL JS decision) and ADR-017
(superseding it with Leaflet after a real-browser WebGL2 failure).

Phase 7 adds status-history sampling. `ingestServiceStatus` appends to the
same append-only `ServiceStatus` table — no new table or migration, since
that table was already built for exactly this (ADR-004). Scoped to delay
history only. Arrival error (predicted versus actual) would require inferring
an "actual" arrival TfL's API never confirms, and is deferred until that can
be done honestly. See DECISIONS.md ADR-018. Originally run by hand via
`pnpm db:sample:tfl`. Phase 10 replaced that with a background worker.

Phase 8 adds a reliability figure per line. `getLineReliability`
(`src/server/queries/reliability.ts`) computes a time-weighted percentage of
a 7-day window spent in `GOOD_SERVICE`, on demand from `ServiceStatus`
history — no new table, no migration, no background job. It never
extrapolates before a line's first real observation: a line with only a few
hours of history reports that coverage rather than a fabricated 7-day
figure, shown via a `ReliabilitySummary` card on each line's detail page.
See DECISIONS.md ADR-019.

Phase 9 adds a crowding section per station. `getStationOccupancy`
(`src/server/queries/occupancy.ts`) calls TfL's real Crowding API live, once
per line serving that station. TfL's own 1–6 "typical for this time" scale
is kept as-is rather than converted into an invented percentage, and is
always shown with a `confidence: "typical"` label so it is never mistaken
for a live measurement. There is no live occupancy API to measure from. No
new table — fetched on demand like arrivals, not ingested. See DECISIONS.md
ADR-020.

Phase 10 adds a background worker. `pnpm worker` (`worker/index.ts`) runs two
BullMQ jobs against Redis — `sync-tfl` every 6 hours (lines, stops, and
status) and `sample-status` every 2 minutes (status only), replacing the
manual `db:sync:tfl` / `db:sample:tfl` cadence. Every real status change
either job detects is published over Redis pub/sub.
`src/app/api/live/status/route.ts` relays it to the browser via Server-Sent
Events, and any open page's status badge live-patches without a refresh.
Zustand, installed since Phases 1–3, is what holds those overrides. No
monorepo split — the worker is a second process in the same package. See
DECISIONS.md ADR-021.

Phase 11 adds explainable anomaly detection. `getLineAnomaly`
(`src/server/queries/anomaly.ts`) compares a line's last 24h reliability
against its own rolling 7-day baseline (both computed via the existing
`calculateReliability`, ADR-019) and flags it when the deviation clears 15
points with enough recent coverage to be meaningful. There is no statistical
model — the explanation is the two percentages being compared. Computed on
demand, no new table. See DECISIONS.md ADR-022.

Phase 12 adds reliability prediction. A `ReliabilityPrediction` table (the
exception to "compute on demand" — a prediction has to be stored before its
outcome is known, or evaluating it would just be hindsight) holds a
baseline-persistence forecast per line (next 24h equals the current 7-day
baseline, no trained model). A third worker job, `predict-reliability`,
generates and evaluates it once daily (`src/server/domain/prediction/`).
Arrival prediction is still out of scope — Phase 7 (ADR-018) already ruled
out inferring an "actual" arrival TfL's API never confirms. See DECISIONS.md
ADR-023.

Phase 13 adds `SimulationProvider`
(`src/server/providers/simulation/simulation-provider.ts`) — the same
`TransitProvider` interface as `TflProvider` and `DemoProvider`, reusing
`DemoProvider`'s network structure and applying an explicit,
developer-supplied disruption scenario (reproducible and explainable, like
every other derived-data feature). Every simulated line lands as its own
separate `(source, externalRef)` row, never overwriting a real one, and
`LineCard` / `LineStatusCard` render a "Simulated" tag wherever
`source === "simulation"`. That is the concrete implementation of the rule
in AGENTS.md that simulation data must stay visually distinct from live
data. `pnpm db:sync:simulation` runs it through the same ingestion pipeline
every provider uses. See DECISIONS.md ADR-024.

Phase 14 adds auth and personalisation. **Better Auth**, self-hosted against
the existing Postgres and Prisma setup (`src/lib/auth.ts`). Email and
password only, with no email verification, because no email-sending service
is configured — see DECISIONS.md ADR-025. `Favourite` lets a signed-in user
star a line or station (`src/components/network/favourite-button.tsx`,
`/favourites`) — exactly one of `lineId` or `stopId`, enforced at the API
boundary rather than the schema (a Postgres unique index cannot express
"exactly one of two nullable columns", because `NULL` is never equal to
`NULL`). See DECISIONS.md ADR-025.

Phase 15 adds production observability and a hardening pass. **Sentry**
(`@sentry/nextjs`) and **PostHog** (`posthog-js`) are both wired via Next.js
16's `instrumentation.ts` / `instrumentation-client.ts` convention, and stay
inert until `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY` are set.
No account exists for this project to report to yet, and pretending
otherwise would violate the same "never fabricate" principle this project
applies to transit data (see DECISIONS.md ADR-026). Alongside that: an
accessibility pass (ARIA labels on the map and status banner,
`aria-invalid` / `role="alert"` wiring on the auth forms, and a bug fix in
`FavouriteButton` that mis-rendered on a failed request), security headers
(`Content-Security-Policy`, `X-Frame-Options`, and a `Permissions-Policy`
that denies geolocation), and a `pnpm audit` pass. See DECISIONS.md ADR-027
and [DEPLOYMENT.md](./DEPLOYMENT.md) for the documented deployment target,
including the resolution of the Vercel/SSE timeout question left open since
Phase 10.
