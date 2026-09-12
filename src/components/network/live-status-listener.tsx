"use client";

import { useEffect } from "react";
import { useLiveStatusStore } from "@/lib/live-status-store";
import type { ServiceStatusLevel } from "@/server/domain/types";

interface StatusUpdateMessage {
  lineId: string;
  status: ServiceStatusLevel;
  description: string | null;
  recordedAt: string;
}

/**
 * Mounted once in the root layout so the SSE connection persists across
 * client-side navigations rather than reconnecting per page. Renders
 * nothing — it only feeds useLiveStatusStore.
 */
export function LiveStatusListener() {
  const setOverride = useLiveStatusStore((state) => state.setOverride);

  useEffect(() => {
    const source = new EventSource("/api/live/status");

    source.onmessage = (event) => {
      const data: StatusUpdateMessage = JSON.parse(event.data);
      setOverride(data.lineId, {
        status: data.status,
        description: data.description,
        recordedAt: new Date(data.recordedAt),
      });
    };

    return () => source.close();
  }, [setOverride]);

  return null;
}
