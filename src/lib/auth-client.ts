import { createAuthClient } from "better-auth/react";

/**
 * Client-side counterpart to src/lib/auth.ts — provides useSession() and
 * the signIn/signUp/signOut actions to client components.
 */
export const authClient = createAuthClient();
