import Link from "next/link";
import { notFound } from "next/navigation";
import { AnomalyBanner } from "@/components/network/anomaly-banner";
import { LineStatusCard } from "@/components/network/line-status-card";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { PredictionSummary } from "@/components/network/prediction-summary";
import { ReliabilitySummary } from "@/components/network/reliability-summary";
import { getLineAnomaly } from "@/server/queries/anomaly";
import { getLineDetail } from "@/server/queries/lines";
import { getLinePredictionSummary } from "@/server/queries/prediction";
import { getLineReliability } from "@/server/queries/reliability";

// Renders a "last updated" timestamp from live data — must not be frozen
// into a build-time static page.
export const dynamic = "force-dynamic";

export default async function LineDetailPage({ params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const line = await getLineDetail(lineId);

  if (!line) notFound();

  const [reliability, anomaly, prediction] = await Promise.all([
    getLineReliability(lineId),
    getLineAnomaly(lineId),
    getLinePredictionSummary(lineId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-4 rounded-full"
          style={{ backgroundColor: line.color ?? "#52525b" }}
        />
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ModeIcon mode={line.mode} className="size-4" />
            {modeLabel(line.mode)}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{line.name}</h1>
        </div>
      </div>

      <LineStatusCard
        lineId={line.id}
        status={line.status}
        description={line.statusDescription}
        recordedAt={line.statusRecordedAt}
        source={line.source}
      />

      <AnomalyBanner anomaly={anomaly} />

      <ReliabilitySummary reliability={reliability} />

      <PredictionSummary prediction={prediction} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Stations ({line.stops.length})</h2>
        <ol className="flex flex-col gap-1">
          {line.stops.map((stop, index) => (
            <li key={stop.id}>
              <Link
                href={`/stations/${stop.id}`}
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
              >
                <span className="w-6 text-right text-xs text-muted-foreground">{index + 1}</span>
                <span>{stop.name}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
