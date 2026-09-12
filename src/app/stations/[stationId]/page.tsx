import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrivalBoard } from "@/components/network/arrival-board";
import { LineBadge } from "@/components/network/line-badge";
import { NetworkMap } from "@/components/network/network-map";
import { OccupancySummary } from "@/components/network/occupancy-summary";
import { StopHierarchyBreadcrumb } from "@/components/network/stop-hierarchy-breadcrumb";
import { getArrivalBoard } from "@/server/queries/arrivals";
import { getStationOccupancy } from "@/server/queries/occupancy";
import { getStationDetail } from "@/server/queries/stops";

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const [station, board, occupancies] = await Promise.all([
    getStationDetail(stationId),
    getArrivalBoard(stationId),
    getStationOccupancy(stationId),
  ]);

  if (!station) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <StopHierarchyBreadcrumb station={station} />
        <h1 className="text-3xl font-bold tracking-tight">{station.name}</h1>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Lines</h2>
        <div className="flex flex-wrap gap-2">
          {station.lines.map((line) => (
            <Link key={line.id} href={`/lines/${line.id}`}>
              <LineBadge name={line.name} color={line.color} />
            </Link>
          ))}
        </div>
      </div>

      {station.children.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Platforms</h2>
          <ul className="flex flex-col gap-1">
            {station.children.map((child) => (
              <li key={child.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                {child.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {station.lat !== null && station.lon !== null && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Location</h2>
          <NetworkMap
            stops={[
              {
                id: station.id,
                name: station.name,
                lat: station.lat,
                lon: station.lon,
                lineColor: station.lines[0]?.color ?? null,
              },
            ]}
            className="h-[300px] w-full rounded-lg border"
            maxZoom={15}
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Arrivals</h2>
        {board ? (
          <ArrivalBoard board={board} />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Arrivals aren't available for this station right now.
          </div>
        )}
      </div>

      <OccupancySummary occupancies={occupancies} />
    </div>
  );
}
