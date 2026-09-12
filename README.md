# TransitPulse

Real-time public transport intelligence for London — reliability, crowding,
and disruption context on top of live service data, not just "next train in
4 minutes."

> **Current status: Phases 1–11 of 15.** A static network explorer with a
> real `TflProvider` (`pnpm db:sync:tfl`) alongside the seeded demo data,
> live arrival boards on each station page (fetched per request, not
> stored — see DECISIONS.md ADR-015), an interactive Leaflet network
> map at `/map` plus a per-station location embed (ADR-017), a
> time-weighted reliability figure per line computed on demand from
> `ServiceStatus` history (ADR-019), a per-station crowding section using
> TfL's real (static/historical, never live) typical-crowding data,
> explicitly labelled as such (ADR-020), a BullMQ worker (`pnpm worker`)
> publishing real status changes over Redis so open pages live-patch their
> status badges via Server-Sent Events (ADR-021), and explainable,
> threshold-based anomaly detection comparing a line's last 24h against
> its own 7-day baseline (ADR-022). No prediction yet (see
> [Roadmap](#roadmap) below and [ARCHITECTURE.md](./ARCHITECTURE.md) for
> what's built vs planned).

## What this is (and isn't)

TransitPulse is being built as a portfolio-grade, AI-assisted engineering
project demonstrating a real provider-abstracted data platform: external
ingestion, a provider-neutral domain model, geospatial/realtime features,
historical analytics, and production engineering — not a Citymapper clone,
not a journey planner, and not a system that fabricates transport data it
doesn't actually have.

Data provenance is a first-class concern throughout: every line, stop, and
status row is tagged with where it came from (`source` + `externalRef`), so
demo data, TfL data, and simulated data are never confused with each other.

## Data sources today

**Demo/fixture data only** (`tests/fixtures/demo/*.json`), covering a small
realistic subset of the London network — Central, Jubilee, and Elizabeth
lines; Stratford, Liverpool Street, Bond Street, and a handful of other
stations, including one station/platform hierarchy pair. This is clearly
demo data, not live London transport status — see
[ARCHITECTURE.md](./ARCHITECTURE.md) for how live TfL data will plug into
the same pipeline in a later phase without a domain rewrite.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui (Radix) |
| Validation | Zod (provider boundary + env) |
| Client state | Zustand (live status overrides via SSE — see DECISIONS.md ADR-021) |
| Server-fetched state | TanStack Query (search-as-you-type only) |
| Forms | React Hook Form (installed for the fixed target stack; unwired until a real form exists — see DECISIONS.md) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Map | Leaflet + OpenStreetMap raster tiles (no API key — see DECISIONS.md ADR-017) |
| Jobs / realtime | BullMQ + Redis, SSE for browser push (ADR-021) |
| Lint/format | Biome |
| Git hooks | Husky + lint-staged |
| Testing | Vitest, React Testing Library, Playwright |
| CI | GitHub Actions |

Redis, BullMQ, and an auth provider are **not** installed yet — they have
no real use case until later phases (see
[DECISIONS.md](./DECISIONS.md)).

## Local setup

```bash
pnpm install
docker compose up -d          # Postgres on localhost:5435
pnpm prisma migrate dev
pnpm db:seed                  # runs the demo provider through the real ingestion pipeline
pnpm dev
```

Copy `.env.example` to `.env` first if it doesn't already exist locally.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NODE_ENV` | yes (defaults to `development`) | |
| `NEXT_PUBLIC_APP_NAME` | yes | Display name, client-exposed |
| `TFL_APP_KEY` | only for `pnpm db:sync:tfl` and any page reading a `source: "tfl"` stop's arrivals | TfL Unified API key — get one at [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk) |

### Database

Single Postgres instance via `docker-compose.yml`, port **5435** (not 5432,
to avoid colliding with other local Postgres instances). Schema in
`prisma/schema.prisma`; see [ARCHITECTURE.md](./ARCHITECTURE.md) for the
data model and [DECISIONS.md](./DECISIONS.md) for why it's shaped this way.

A second database, `transitpulse_test`, is used by the integration tests —
see [TESTING.md](./TESTING.md).

### Testing

```bash
pnpm typecheck
pnpm lint
pnpm test           # Vitest: unit + component tests
pnpm test:e2e        # Playwright (requires the app built/running — see playwright.config.ts)
```

Full details in [TESTING.md](./TESTING.md).

## Roadmap

Phases 1–3 (this repo, in depth) build a static network explorer:
foundation/tooling, the internal transit domain + provider abstraction over
demo data, and a basic UI (network overview, lines, stations, search).

Phase 4 adds `TflProvider` (`src/server/providers/tfl/`), a real
`TransitProvider` implementation against the live TfL Unified API, and
`pnpm db:sync:tfl` to run it through the same ingestion pipeline the demo
data uses. See DECISIONS.md ADR-014 for the scoping decisions. The UI
itself isn't wired to prefer or select a source yet — see the caution note
in `prisma/sync-tfl.ts`.

Phase 5 adds live arrival boards on each station page: `getArrivals` is
now implemented on both `TflProvider` and `DemoProvider`, fetched fresh on
every request through a new `src/server/domain/live/` layer rather than
ingested into Postgres (arrivals are seconds-old predictions, not
structural network data — see DECISIONS.md ADR-015). A failed live fetch
shows an honest "not available" state rather than an empty-looking board.

Phase 6 adds an interactive Leaflet network map at `/map` (`getMapStops`
→ `NetworkMap`) plotting every station/hub with coordinates, plus a
per-station location embed on the station detail page — one component,
two call sites. No API key required (OpenStreetMap raster tiles); see
DECISIONS.md ADR-016 (original MapLibre GL JS decision) and ADR-017
(superseding it with Leaflet after a real-browser WebGL2 failure).

Phase 7 adds status-history sampling: `ingestServiceStatus`, appending to
the same append-only `ServiceStatus` table — no new table or migration,
since that table was already built for exactly this (ADR-004). Scoped to
delay history only; arrival-error (predicted vs. actual) would require
inferring an "actual" arrival TfL's API never confirms, deferred until
that can be done honestly. See DECISIONS.md ADR-018. (Originally run by
hand via `pnpm db:sample:tfl`, no scheduler yet — Phase 10 replaced that
with a real background worker; see below.)

Phase 8 adds a reliability figure per line: `getLineReliability`
(`src/server/queries/reliability.ts`) computes a time-weighted % of a
7-day window spent in `GOOD_SERVICE` on demand from `ServiceStatus`
history — no new table, no migration, no background job. Never
extrapolates before a line's first real observation: a line with only a
few hours of history honestly reports that coverage rather than a
fabricated 7-day figure, shown via a `ReliabilitySummary` card on each
line's detail page. See DECISIONS.md ADR-019.

Phase 9 adds a crowding section per station: `getStationOccupancy`
(`src/server/queries/occupancy.ts`) calls TfL's real Crowding API live,
once per line serving that station — TfL's own 1-6 "typical for this
time" scale, kept as-is rather than converted into an invented
percentage, and always shown with a `confidence: "typical"` label so it's
never mistaken for a live measurement (there is no live occupancy API to
measure from). No new table — fetched on demand like arrivals, not
ingested. See DECISIONS.md ADR-020.

Phase 10 adds a real background worker: `pnpm worker`
(`worker/index.ts`) runs two BullMQ jobs against Redis — `sync-tfl`
every 6 hours (lines/stops/status) and `sample-status` every 2 minutes
(status only), replacing the manual `db:sync:tfl`/`db:sample:tfl`
cadence. Every real status change either job detects is published over
Redis pub/sub; `src/app/api/live/status/route.ts` relays it to the
browser via Server-Sent Events, and any open page's status badge
live-patches without a refresh (Zustand, installed since Phase 1-3,
finally has a use case). No monorepo split — the worker is a second
process in the same package. See DECISIONS.md ADR-021.

Phase 11 adds explainable anomaly detection: `getLineAnomaly`
(`src/server/queries/anomaly.ts`) compares a line's last 24h reliability
against its own rolling 7-day baseline (both computed via the existing
`calculateReliability`, ADR-019) and flags it when the deviation clears
15 points with enough recent coverage to be meaningful. No statistical
model — the "explanation" is just the two percentages being compared, so
it's never a black box. Computed on demand, no new table. See
DECISIONS.md ADR-022.

Phases 12–15 are architected for but not yet built: arrival prediction,
a simulation provider, personalisation, and production observability.
See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the roadmap-at-a-glance and
[DECISIONS.md](./DECISIONS.md) for the ADRs already made in anticipation of
them.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, data model, roadmap
- [DECISIONS.md](./DECISIONS.md) — ADR log
- [TESTING.md](./TESTING.md) — test strategy and how to run each suite
- [AGENTS.md](./AGENTS.md) — conventions for AI coding agents working in this repo
- [AI_ENGINEERING.md](./AI_ENGINEERING.md) — how AI assistance was used on this project
