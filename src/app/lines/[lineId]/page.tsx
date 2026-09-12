import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { ReliabilitySummary } from "@/components/network/reliability-summary";
import { ServiceStatusBadge } from "@/components/network/service-status-badge";
import { formatLondonDateTime } from "@/lib/time";
import { getLineDetail } from "@/server/queries/lines";
import { getLineReliability } from "@/server/queries/reliability";

// Renders a "last updated" timestamp from live data — must not be frozen
// into a build-time static page.
export const dynamic = "force-dynamic";

export default async function LineDetailPage({ params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const line = await getLineDetail(lineId);

  if (!line) notFound();

  const reliability = await getLineReliability(lineId);

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

      <div className="rounded-lg border bg-background p-4">
        <ServiceStatusBadge status={line.status} className="text-base" />
        {line.statusDescription && (
          <p className="mt-1 text-sm text-muted-foreground">{line.statusDescription}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated {formatLondonDateTime(line.statusRecordedAt)}
        </p>
      </div>

      <ReliabilitySummary reliability={reliability} />

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
