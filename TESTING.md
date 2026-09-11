# Testing

## Pyramid

```text
Playwright (1 journey)          ← tests/e2e/
        ▲
RTL component tests             ← tests/components/
        ▲
Vitest integration (real DB)    ← tests/unit/domain/ingestion/*, tests/unit/server/queries/*
        ▲
Vitest pure unit tests          ← tests/unit/providers/*, tests/unit/domain/ingestion/normalize.test.ts
```

Normal automated test runs (`pnpm test`) never depend on TfL uptime — there
is no TfL integration yet, and won't be exercised by tests even once it
exists (fixture-based contract tests instead, per AGENTS.md).

## Fixtures ↔ seed data

`tests/fixtures/demo/{lines,stops,service-status}.json` is the **single
source of truth** consumed by both `DemoProvider` (used by `prisma/seed.ts`
for local dev/demo data, and by every provider/ingestion test) and directly
by test assertions. There is no second copy anywhere — this makes
fixture/seed drift structurally impossible.

## Test databases

Two Postgres databases in the one `docker-compose.yml` container
(port 5435):

- `transitpulse` — local dev, seeded via `pnpm db:seed`.
- `transitpulse_test` — integration tests. Migrate with `pnpm db:test:migrate`
  (uses `.env.test`, loaded automatically by `tests/setup.ts`).

Integration tests (`tests/unit/domain/ingestion/*`, `tests/unit/server/queries/*`)
hit this real database — not a mock — because the thing actually worth
proving (upsert idempotency, hierarchy resolution, query correctness) can't
be proven against a mock. `vitest.config.ts` sets `fileParallelism: false`
so these files don't race each other over shared rows like the `London`
network.

## Running each suite

```bash
pnpm typecheck
pnpm lint
pnpm test              # all Vitest suites (unit + component)
pnpm test:watch         # watch mode

pnpm exec playwright install --with-deps chromium   # one-time
pnpm test:e2e           # Playwright — builds and starts the app itself (see playwright.config.ts)
```

## What's covered

**Provider layer** (`tests/unit/providers/demo-provider.test.ts`): fixture
data matches the `Provider*` Zod schemas; a malformed record is rejected
(tested by parsing directly against the schema, not by mutating the real
fixture files on disk — mutating shared fixtures would make parallel test
runs flaky); optional methods (`getArrivals` etc.) are confirmed absent
until a phase actually implements them.

**Normalization** (`tests/unit/domain/ingestion/normalize.test.ts`): pure
functions, no DB — mode/status label mapping, hierarchy field passthrough,
`NormalizationError` on an unrecognized value.

**Ingestion** (`tests/unit/domain/ingestion/ingest-{lines,stops,service-status}.test.ts`):
against the real test DB — upsert idempotency (run twice, assert row counts
don't change), hierarchy resolution (platform → parent station), line-stop
sequence correctness for a multi-line interchange, service-status
idempotency on `(lineId, source, recordedAt)`.

**Queries** (`tests/unit/server/queries/{search,lines}.test.ts`): search
matches, empty-term/no-match handling; line detail returns stops in
sequence order with platform-level stops collapsed out.

**Components** (`tests/components/*.test.tsx`): status badges always
render a text label (never colour alone — accessibility requirement);
`LineCard` links to the right route; `SearchBox` opens, fetches, and
navigates on selection.

**E2E** (`tests/e2e/network-to-station.spec.ts`): network overview → line
detail → station detail, against a built+seeded instance — exercises the
real ingestion pipeline's output end to end, not a mocked one.

## jsdom setup notes

`tests/setup.ts` registers RTL's `cleanup()` in `afterEach` explicitly
(Vitest doesn't expose `globals: true`, so RTL's auto-detection doesn't
fire), and polyfills `scrollIntoView`/pointer-capture/`ResizeObserver` —
Radix UI's Dialog/Command primitives (used by the search box) call these
during mount/interaction, and jsdom doesn't implement them.

## CI

`.github/workflows/ci.yml`:

1. `lint-test-build` job (blocking): install → typecheck → Biome →
   `prisma migrate deploy` + seed the dev DB → create + migrate
   `transitpulse_test` → `pnpm test` → `pnpm build`.
2. `e2e` job (**non-blocking**, `continue-on-error: true`): migrate + seed
   → install Playwright's Chromium → `pnpm test:e2e`.

**Follow-up**: make the `e2e` job blocking once it's proven stable in CI
for a run or two. It starts non-blocking per the project's own guidance on
not letting Playwright friction block early iteration — but the intent is
to promote it, not leave it soft-failing indefinitely.

Provider adapter and ingestion/reliability-style tests are treated as
release-blocking (they're in the required `lint-test-build` job) — that's
where data-quality regressions would actually surface.
