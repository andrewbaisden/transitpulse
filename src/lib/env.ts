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
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    TFL_APP_KEY: process.env.TFL_APP_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
