# Deployment

This describes how to deploy TransitPulse — it has not actually been
deployed anywhere by this project (no cloud accounts have been
provisioned). See DECISIONS.md ADR-027 for why this is documentation, not
a live deployment, and ARCHITECTURE.md's "Deployment (target)" section for
the design this follows.

## The one real constraint: three different runtime shapes

TransitPulse isn't a single deployable unit — it's three processes with
different lifetimes:

| Process | Lifetime | Why |
|---|---|---|
| Next.js app (`pnpm start`) | Request-scoped, can be serverless | Server Components, API routes, `/api/auth/*`, `/api/favourites` |
| `worker/index.ts` (`pnpm worker`) | Must run continuously, forever | BullMQ's repeatable jobs (`sync-tfl`, `sample-status`, `predict-reliability`) fire on their own schedule — nothing waiting on the process for them is what invokes them |
| `/api/live/status` (SSE) | Must hold each connection open indefinitely | A serverless function that returns once a client connects defeats the point — see the caveat below |

**Recommendation: one long-running host, not Vercel.** Deploy the whole
Next.js app (`pnpm build && pnpm start`) and the worker as two processes
on the same platform — Fly.io, Railway, or Render all support this
directly (a web process + a background worker process from one repo, one
deploy). This sidesteps the SSE/serverless mismatch entirely, at the cost
of losing Vercel's zero-config preview deployments. Given ADR-001 already
chose "single Next.js app, no monorepo split" for simplicity, this is the
same philosophy applied to hosting.

**Alternative: Vercel for the app, a small host for the worker.** If
Vercel's DX is worth keeping:

- The Next.js app deploys to Vercel normally.
- `worker/index.ts` still needs its own always-on host (Fly.io/Railway) —
  Vercel has no facility for a process that isn't invoked by a request.
- `/api/live/status` is the problem: Vercel serverless functions have a
  maximum execution duration (`maxDuration` route config can raise it,
  but every plan still caps it — see
  [Next.js's `maxDuration` docs](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration)),
  and even Vercel's Fluid Compute is billed/bounded, not designed for
  connections open for hours. A serverless SSE endpoint will have every
  client disconnected and forced to reconnect whenever the function's
  time limit hits — the client-side `EventSource` in
  `live-status-listener.tsx` does auto-reconnect, so this degrades to
  "occasional reconnect blips" rather than breaking outright, but it's
  not the clean design the single-host option gives you. If going this
  route, run `/api/live/status` specifically on the same always-on host
  as the worker (a second small Node/Next process, reverse-proxied at
  `/api/live/status`), not on Vercel.

This resolves the "not yet verified against Vercel's default function
timeout" note that had been open in ARCHITECTURE.md since Phase 10.

## Managed infrastructure

| Piece | What's needed | Notes |
|---|---|---|
| Postgres | Any managed Postgres reachable over TCP | Neon, Supabase, RDS, or the host's own managed Postgres all work — Prisma's `@prisma/adapter-pg` just needs a connection string |
| Redis | Any Redis reachable over the standard protocol | Upstash (serverless-friendly, has a free tier), or the host's own managed Redis. **Not** Upstash's REST-only mode — `ioredis` and BullMQ both need the native Redis protocol (`rediss://`/`redis://`), not HTTP |

## Environment variables

All required/optional vars are validated at boot by `src/lib/env.ts` — a
misconfigured deployment fails fast with a clear error rather than a
confusing runtime crash. See README.md's environment variable table for
the full list. In production specifically:

- `BETTER_AUTH_SECRET` — generate a fresh one for production
  (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`),
  never reuse the `.env`/`.env.example` development value.
- `BETTER_AUTH_URL` — must be the real public URL (Better Auth uses it for
  cookie/callback correctness).
- `DATABASE_URL`/`REDIS_URL` — the managed instances above.
- `NEXT_PUBLIC_SENTRY_DSN`/`NEXT_PUBLIC_POSTHOG_KEY` — optional; both
  integrations are inert until set (ADR-026). Set them only once real
  Sentry/PostHog accounts exist.
- `TFL_APP_KEY` — only needed to run `pnpm db:sync:tfl`/the worker's
  `sync-tfl`/`sample-status` jobs against the real TfL API, not by the
  Next.js app's own request handling.

## Release steps

1. `pnpm exec prisma migrate deploy` against the production `DATABASE_URL`
   (not `migrate dev` — that's dev-only and will prompt interactively).
2. `pnpm build`.
3. Start `pnpm start` (web) and `pnpm worker` (background) as two
   processes/services.
4. Confirm `/api/live/status` is reachable and a status change (real, from
   `sync-tfl`/`sample-status`, or a manual `redis-cli publish` as in
   ADR-021's own verification step) live-patches an open page.

## What this project deliberately does not do

No infrastructure-as-code (Terraform/Pulumi) — three managed services and
two processes don't justify one yet. No CDN/edge config beyond what the
chosen host provides by default. No autoscaling policy — out of scope
until real traffic exists to scale for.
