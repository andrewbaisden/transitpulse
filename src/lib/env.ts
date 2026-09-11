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
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
