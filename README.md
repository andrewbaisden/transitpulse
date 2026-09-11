# TransitPulse

Real-time public transport intelligence for London — reliability, crowding,
and disruption context on top of live service data, not just "next train in
4 minutes."

> **Current status: Phases 1–6 of 15.** A static network explorer with a
> real `TflProvider` (`pnpm db:sync:tfl`) alongside the seeded demo data,
> live arrival boards on each station page (fetched per request, not
> stored — see DECISIONS.md ADR-015), and an interactive MapLibre network
> map at `/map` plus a per-station location embed (ADR-016). No
> reliability analytics, crowding, or prediction yet (see
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
| Client state | Zustand (reserved — no UI state complex enough to need it yet) |
| Server-fetched state | TanStack Query (search-as-you-type only) |
| Forms | React Hook Form (installed for the fixed target stack; unwired until a real form exists — see DECISIONS.md) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Map | MapLibre GL JS + OpenFreeMap tiles (no API key — see DECISIONS.md ADR-016) |
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

Phase 6 adds an interactive MapLibre network map at `/map` (`getMapStops`
→ `NetworkMap`) plotting every station/hub with coordinates, plus a
per-station location embed on the station detail page — one component,
two call sites. No API key required (OpenFreeMap tiles); see DECISIONS.md
ADR-016.

Phases 7–15 are architected for but not yet built: historical reliability,
crowding/occupancy, realtime infrastructure, anomaly detection, arrival
prediction, a simulation provider, personalisation, and production
observability. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the roadmap-at-a-glance and
[DECISIONS.md](./DECISIONS.md) for the ADRs already made in anticipation of
them.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, data model, roadmap
- [DECISIONS.md](./DECISIONS.md) — ADR log
- [TESTING.md](./TESTING.md) — test strategy and how to run each suite
- [AGENTS.md](./AGENTS.md) — conventions for AI coding agents working in this repo
- [AI_ENGINEERING.md](./AI_ENGINEERING.md) — how AI assistance was used on this project
