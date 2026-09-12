"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { ServiceStatusBadge } from "@/components/network/service-status-badge";
import { SimulatedTag } from "@/components/network/simulated-tag";
import { Card, CardContent } from "@/components/ui/card";
import { getLineColor } from "@/lib/line-colors";
import { useLiveServiceStatus } from "@/lib/live-status-store";
import { formatRelativeToNow } from "@/lib/time";
import type { LineWithStatus } from "@/server/queries/network";

export function LineCard({ line }: { line: LineWithStatus }) {
  const live = useLiveServiceStatus(line.id, {
    status: line.status,
    description: line.statusDescription,
    recordedAt: line.statusRecordedAt,
  });
  const lineColor = getLineColor(line.name, line.color);

  return (
    <Link href={`/lines/${line.id}`} className="group block h-full" data-testid="line-card">
      <Card className="relative h-full gap-0 overflow-hidden rounded-2xl bg-white/90 py-0 shadow-[0_1px_2px_rgb(10_37_64/4%)] ring-1 ring-slate-200/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_36px_rgb(10_37_64/10%)] group-hover:ring-slate-300">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: lineColor }}
        />
        <CardContent className="flex h-full items-center justify-between gap-4 py-5 pr-4 pl-6 sm:pr-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
            >
              <ModeIcon mode={line.mode} className="size-4.5 text-slate-600" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2 font-semibold tracking-[-0.01em] text-[#0a2540]">
                <span>{line.name}</span>
                {line.source === "simulation" && <SimulatedTag />}
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{modeLabel(line.mode)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-right">
            <div>
              <ServiceStatusBadge status={live.status} />
              <p className="mt-1 text-[11px] text-slate-500">
                Updated {formatRelativeToNow(live.recordedAt)}
              </p>
            </div>
            <span className="hidden size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-[#635bff] group-hover:text-white sm:flex">
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
