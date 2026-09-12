import type { Instrumentation } from "next";
import { env } from "@/lib/env";

/**
 * Server-side Sentry, inert by default. `NEXT_PUBLIC_SENTRY_DSN` is unset
 * in every environment this project actually runs in (no Sentry account
 * has been provisioned) — `register`/`onRequestError` both no-op in that
 * case rather than pretending errors are being reported somewhere. See
 * DECISIONS.md ADR-026.
 */
export async function register() {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    // Never send request bodies/headers by default — favours over-sharing
    // to a third party, consistent with AGENTS.md's privacy rule.
    sendDefaultPii: false,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
