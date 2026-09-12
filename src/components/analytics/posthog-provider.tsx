"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { env } from "@/lib/env";

let initialized = false;

/**
 * Inert by default — `NEXT_PUBLIC_POSTHOG_KEY` is unset in every
 * environment this project actually runs in (no PostHog account has been
 * provisioned). When it is set, this is deliberately conservative:
 * `person_profiles: "never"` (no `identify()` call anywhere in this
 * codebase — AGENTS.md's privacy rule caps PII at what Better Auth itself
 * needs, which PostHog never sees), session recording off, and Do Not
 * Track respected. See DECISIONS.md ADR-026.
 */
export function PostHogProvider() {
  useEffect(() => {
    if (initialized || !env.NEXT_PUBLIC_POSTHOG_KEY) return;
    initialized = true;

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: "history_change",
      person_profiles: "never",
      disable_session_recording: true,
      respect_dnt: true,
    });
  }, []);

  return null;
}
