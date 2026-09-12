import { env } from "@/lib/env";

/**
 * Client-side Sentry, inert by default — see src/instrumentation.ts and
 * DECISIONS.md ADR-026. Executes before hydration (Next.js's
 * instrumentation-client convention), so this stays synchronous rather
 * than an awaited dynamic import.
 */
if (env.NEXT_PUBLIC_SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      sendDefaultPii: false,
    });
  });
}
