<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TransitPulse — Agent Conventions

## Non-negotiable rules

- **Never fabricate realtime transit values.** If data isn't available, say
  so in the UI — don't invent a plausible-looking number.
- **Never treat estimated/simulated crowding as official measured
  occupancy.** Every crowding value (once implemented) must carry a
  source/confidence field.
- **Never expose provider response types outside `src/server/providers/`.**
  The domain (`src/server/domain/`) and everything above it only ever sees
  `Domain*` types from `src/server/domain/types.ts`.
- **Never change reliability/prediction algorithms (once they exist)
  without tests and a DECISIONS.md entry.**
- **Simulation data (once implemented) must always be visually
  distinguishable from live data** — never silently blended.

## Provider boundary

`TransitProvider` (`src/server/providers/types.ts`) is the only interface
the domain depends on. A new provider (TfL, GTFS-RT, Simulation):

1. Implements `TransitProvider`, returning `Provider*` shapes validated by
   the Zod schemas already in `providers/types.ts` — extend those schemas
   rather than inventing parallel ones.
2. Never gets imported by anything in `src/app/` or `src/server/queries/`
   directly — only `src/server/domain/ingestion/*`, `prisma/seed.ts`,
   `prisma/sync-tfl.ts`/`prisma/sample-status.ts`, `worker/index.ts`
   (Phase 10's BullMQ jobs — see DECISIONS.md ADR-021), and
   `src/server/domain/live/*` (live, non-persisted per-request reads —
   e.g. arrivals, occupancy; see ADR-015/ADR-020) touch a concrete
   provider.

## Data flow rule (RSC vs React Query)

Default to Server Components reading through `src/server/queries/*.ts`
(plain async functions calling Prisma). **React Query is reserved for
client-initiated post-mount fetches only** — today that's exactly one case,
the search box. Don't add `useQuery` for data a Server Component could read
directly; don't add a new `src/server/queries/*` function without checking
whether an existing one already covers it.

## Prisma / schema changes

1. Edit `prisma/schema.prisma`.
2. `pnpm exec prisma migrate dev --name <description>` against the dev DB
   (port 5435). If the CLI refuses non-interactively (it does in some
   sandboxed/CI shells even with an empty confirmation), hand-write the
   migration SQL matching what the CLI would generate and apply with
   `pnpm exec prisma migrate deploy`.
3. Mirror the same migration against the test DB:
   `pnpm db:test:migrate`.
4. Run `pnpm exec prisma generate`.
5. Update `src/server/domain/types.ts` / normalizer / ingestion if the
   change affects provenance or provider-facing shapes.

Every dynamic/derived table gets a `source` column (and `externalRef` where
it maps to a provider entity) — see DECISIONS.md ADR-005. Don't add a table
without deciding its provenance story.

## Testing expectations before a PR

- `pnpm typecheck && pnpm lint && pnpm test` clean.
- New provider logic: a fixture in `tests/fixtures/demo/` (or a new
  provider's own fixtures) plus a schema-validation test.
- New derived/normalization logic: a pure-function unit test with no DB.
- New ingestion logic: an integration test against the real test DB
  asserting idempotency (run it twice, assert row counts don't change).
- New page/component with meaningful logic: an RTL test.

## Dependency policy

Justify every new dependency against an actual Phase 1-3 need — see the
stack table in README.md and the "explicitly not installed" list in
DECISIONS.md. Don't add Redis/BullMQ, an auth provider, or a map library
ahead of the phase that needs them.

## Privacy

No user location/GPS collection. No PII beyond what Better Auth (Phase
14, ADR-025) itself requires — name, email, and hashed password only; no
email verification, so no email-sending service holds user emails either.

## Commits

Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`,
`docs:`, `perf:`), scoped where it adds clarity (`feat(tfl): ...`,
`fix(arrivals): ...`). Keep commits logically scoped — don't bundle
unrelated changes.
