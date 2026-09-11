# AI Engineering

TransitPulse is presented as an **AI-assisted engineering project** — a
human directing, reviewing, and making judgment calls, with an AI agent
(Claude Code) doing a large share of the implementation. Not an
autonomous AI transport system, and not a claim that any part of the app
itself uses AI to invent transport conditions (the spec explicitly forbids
that — see AGENTS.md).

## This phase (1-3) — what happened

The initial brief was a large, 85-section product spec covering the full
15-phase vision. Given the scope, the human scoped this pass explicitly to
Phases 1-3 (foundation, core domain over demo data, basic UI), with 4-15
left as an architectural roadmap rather than attempted in one pass — a
direction call made by the human, not inferred by the agent.

Within that scope, the agent:

- Proposed the minimal Prisma schema (deliberately deferring most of the
  spec's suggested entity list — `Route`, `Vehicle`, `Occupancy`,
  `Disruption`, `Reliability`, etc. — until a phase actually needs them).
- Designed the `TransitProvider` interface and the
  provider → Zod → normalize → ingest pipeline, then implemented
  `DemoProvider` as its first (and currently only) implementation.
- Discovered and fixed several environment-specific issues during
  implementation, notably: Prisma's default `latest` resolving to an
  `8.0.0-rc` line with an unwanted `workerd`/`alchemy` dependency chain
  (pinned to `7.x` instead); Prisma 7's new client generator requiring an
  explicit driver adapter rather than implicit `datasource.url` connection;
  `prisma init` auto-scaffolding unrequested AI-agent "skills" directories
  (removed); a race condition in integration tests from parallel test
  files sharing one Postgres database (fixed via `fileParallelism: false`);
  a missing `<Command>` root in the shadcn Command Dialog usage that only
  surfaced as a cryptic jsdom test failure.
- Wrote the full Vitest/RTL suite and one Playwright journey. The
  Playwright browser binary could not be downloaded in the sandboxed
  session that built this (network restriction on the CDN); the equivalent
  navigation flow was verified via direct HTTP smoke tests instead, and the
  test is expected to run normally in CI where that restriction doesn't
  apply — this is disclosed rather than silently claimed as verified.

## Human responsibilities

- Product direction and phase scoping (what to build now vs defer).
- Architectural approval (schema shape, provider boundary, query-layer vs
  React Query split — all proposed by the agent, decided by the human via
  the plan-mode review before implementation began).
- Transport-data interpretation and any future reliability/crowding
  methodology approval (not yet applicable — no derived metrics exist yet).
- Final code review, security/licensing choices, and deployment.

## AI-assisted responsibilities (this phase)

- Implementation of the provider abstraction, ingestion pipeline, query
  layer, and UI.
- Test fixtures and the full test suite.
- Migrations and schema iteration (including the manual migration-file
  workaround where the Prisma CLI's interactive confirmation prompt
  couldn't run non-interactively).
- This documentation set.

## What to expand here in later phases

- Phase 8 (reliability): document the methodology once it exists, and who
  approved it.
- Phase 12 (prediction): document how prediction accuracy is evaluated and
  by whom.
- Any phase that introduces a genuinely AI-driven feature (none exist yet —
  Phase 1-3 has no ML/LLM-derived output of any kind) should document what
  it does and does not claim, per the "no AI theatre" principle.
