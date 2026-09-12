import { create } from "zustand";
import type { ServiceStatusLevel } from "@/server/domain/types";

/**
 * Phase 10's realtime feature: SSE-pushed status changes land here, keyed
 * by the internal Line.id, and every badge call site reads through
 * `useLiveServiceStatus` so it live-patches without a manual refresh. See
 * DECISIONS.md ADR-021 — this is Zustand's first real use case in the
 * project (installed since Phase 1-3, unwired until now).
 */
interface LiveStatusOverride {
  status: ServiceStatusLevel;
  description: string | null;
  recordedAt: Date;
}

interface LiveStatusState {
  overrides: Record<string, LiveStatusOverride>;
  setOverride: (lineId: string, override: LiveStatusOverride) => void;
}

export const useLiveStatusStore = create<LiveStatusState>((set) => ({
  overrides: {},
  setOverride: (lineId, override) =>
    set((state) => ({ overrides: { ...state.overrides, [lineId]: override } })),
}));

/**
 * Returns the live override for `lineId` if one has arrived over SSE this
 * session, else the server-rendered `initial` values — so every call site
 * renders correctly before any SSE message ever arrives.
 */
export function useLiveServiceStatus(
  lineId: string,
  initial: { status: ServiceStatusLevel; description: string | null; recordedAt: Date },
): { status: ServiceStatusLevel; description: string | null; recordedAt: Date; isLive: boolean } {
  const override = useLiveStatusStore((state) => state.overrides[lineId]);

  if (!override) {
    return { ...initial, isLive: false };
  }
  return { ...override, isLive: true };
}
