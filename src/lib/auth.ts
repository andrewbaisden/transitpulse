import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";
import { prisma } from "@/server/db/client";

/**
 * Self-hosted (Better Auth), not a third-party account provider (Clerk) —
 * no external account/API key to provision, works directly against the
 * existing Postgres/Prisma setup. See DECISIONS.md ADR-025.
 *
 * Email verification is off: no email-sending service is configured in
 * this project, and pretending to "send" a verification email that never
 * arrives would violate the project's own "never fabricate" ethos just as
 * much as a made-up transit number would.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [nextCookies()],
});
