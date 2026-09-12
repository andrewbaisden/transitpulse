import type { NextConfig } from "next";

// Phase 15 security hardening pass — see DECISIONS.md ADR-027. CSP is
// relaxed in development only for Next.js's own HMR/eval requirements;
// production gets the strict policy. `connect-src`/`img-src` name the
// concrete external origins this app actually talks to today (OSM tiles —
// ADR-016/017) plus Sentry/PostHog's typical ingest hosts so the
// inert-by-default integrations (ADR-026) work the moment real credentials
// are added, without needing this file edited too. A self-hosted Sentry or
// custom PostHog host would still need this list updated.
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://us.i.posthog.com https://*.posthog.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app collects no location/GPS data (AGENTS.md) and has no use for
  // camera/microphone — deny all three outright rather than leave the
  // browser default (which permits the top-level document to grant them).
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
