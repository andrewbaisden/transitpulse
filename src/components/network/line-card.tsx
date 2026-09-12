"use client";

import Link from "next/link";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { ServiceStatusBadge } from "@/components/network/service-status-badge";
import { SimulatedTag } from "@/components/network/simulated-tag";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveServiceStatus } from "@/lib/live-status-store";
import { formatRelativeToNow } from "@/lib/time";
import type { LineWithStatus } from "@/server/queries/network";

export function LineCard({ line }: { line: LineWithStatus }) {
  const live = useLiveServiceStatus(line.id, {
    status: line.status,
    description: line.statusDescription,
    recordedAt: line.statusRecordedAt,
  });

  return (
    <Link href={`/lines/${line.id}`} className="block" data-testid="line-card">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: line.color ?? "#52525b" }}
            />
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <ModeIcon mode={line.mode} className="size-4 text-muted-foreground" />
                {line.name}
                {line.source === "simulation" && <SimulatedTag />}
              </div>
              <p className="text-xs text-muted-foreground">{modeLabel(line.mode)}</p>
            </div>
          </div>
          <div className="text-right">
            <ServiceStatusBadge status={live.status} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated {formatRelativeToNow(live.recordedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
