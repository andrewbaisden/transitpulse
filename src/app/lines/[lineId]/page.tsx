import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnomalyBanner } from "@/components/network/anomaly-banner";
import { FavouriteButton } from "@/components/network/favourite-button";
import { LineStatusCard } from "@/components/network/line-status-card";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { PredictionSummary } from "@/components/network/prediction-summary";
import { ReliabilitySummary } from "@/components/network/reliability-summary";
import { auth } from "@/lib/auth";
import { getLineColor } from "@/lib/line-colors";
import { getLineAnomaly } from "@/server/queries/anomaly";
import { getFavouriteId } from "@/server/queries/favourites";
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

  const session = await auth.api.getSession({ headers: await headers() });
  const [reliability, anomaly, prediction, favouriteId] = await Promise.all([
    getLineReliability(lineId),
    getLineAnomaly(lineId),
    getLinePredictionSummary(lineId),
    session ? getFavouriteId(session.user.id, { lineId }) : Promise.resolve(null),
  ]);
  const lineColor = getLineColor(line.name, line.color);

  return (
    <div className="flex flex-col gap-8">
      <div className="network-grid relative overflow-hidden rounded-3xl border border-white bg-white/85 p-6 shadow-soft sm:p-8">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-2"
          style={{ backgroundColor: lineColor }}
        />
        <div className="flex items-start gap-4 pl-2">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <ModeIcon mode={line.mode} className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {modeLabel(line.mode)}
            </div>
            <h1 className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-[#0a2540] sm:text-5xl">
              {line.name}
            </h1>
          </div>
          <div className="ml-auto">
            <FavouriteButton target={{ lineId: line.id }} initialFavouriteId={favouriteId} />
          </div>
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

      <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold tracking-[-0.02em] text-[#0a2540]">
          Stations <span className="text-slate-400">({line.stops.length})</span>
        </h2>
        <ol className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {line.stops.map((stop, index) => (
            <li key={stop.id}>
              <Link
                href={`/stations/${stop.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[#eef1ff] hover:text-[#3f35c8]"
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
