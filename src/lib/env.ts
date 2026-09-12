import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, fail-fast environment variable validation. Import this instead of
 * reading `process.env` directly so misconfiguration is caught at boot
 * rather than surfacing as a confusing runtime error deep in a query.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Phase 4 (TfL integration): only required by prisma/sync-tfl.ts, so
    // left optional here rather than required — the app itself never needs
    // it (TflProvider is only ever constructed by the sync script).
    TFL_APP_KEY: z.string().min(1).optional(),
    // Phase 10: required like DATABASE_URL, not optional — both the app
    // (SSE route) and worker/index.ts need it. See DECISIONS.md ADR-021.
    REDIS_URL: z.url(),
    // Phase 14 (Better Auth). BETTER_AUTH_SECRET signs session
    // cookies/tokens — required, no default (never guess a secret).
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    // Phase 15 (observability). Both optional and unset by default — this
    // project has no real Sentry/PostHog account to provision, so every
    // call site treats these as "inert until configured," never fabricating
    // that errors/analytics are being captured when they aren't. See
    // DECISIONS.md ADR-026. Sentry DSNs and PostHog project keys are
    // designed to be embedded in client bundles, not secrets, so both are
    // safe as NEXT_PUBLIC_ vars.
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    TFL_APP_KEY: process.env.TFL_APP_KEY,
    REDIS_URL: process.env.REDIS_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
