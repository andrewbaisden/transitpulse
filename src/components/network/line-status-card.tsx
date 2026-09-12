"use client";

import { ServiceStatusBadge } from "@/components/network/service-status-badge";
import { SimulatedTag } from "@/components/network/simulated-tag";
import { useLiveServiceStatus } from "@/lib/live-status-store";
import { formatLondonDateTime } from "@/lib/time";
import type { ServiceStatusLevel } from "@/server/domain/types";

/**
 * Extracted from the line detail page (same pattern as ReliabilitySummary
 * in Phase 8) so this block can read the live-status store — Phase 10's
 * realtime status badges. See DECISIONS.md ADR-021.
 */
export function LineStatusCard({
  lineId,
  status,
  description,
  recordedAt,
  source,
}: {
  lineId: string;
  status: ServiceStatusLevel;
  description: string | null;
  recordedAt: Date;
  source: string;
}) {
  const live = useLiveServiceStatus(lineId, { status, description, recordedAt });

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <ServiceStatusBadge status={live.status} className="text-base" />
        {source === "simulation" && <SimulatedTag />}
      </div>
      {live.description && <p className="mt-1 text-sm text-muted-foreground">{live.description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Last updated {formatLondonDateTime(live.recordedAt)}
      </p>
    </div>
  );
}
