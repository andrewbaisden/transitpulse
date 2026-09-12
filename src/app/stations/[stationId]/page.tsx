import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrivalBoard } from "@/components/network/arrival-board";
import { FavouriteButton } from "@/components/network/favourite-button";
import { LineBadge } from "@/components/network/line-badge";
import { NetworkMap } from "@/components/network/network-map";
import { OccupancySummary } from "@/components/network/occupancy-summary";
import { StopHierarchyBreadcrumb } from "@/components/network/stop-hierarchy-breadcrumb";
import { auth } from "@/lib/auth";
import { getArrivalBoard } from "@/server/queries/arrivals";
import { getFavouriteId } from "@/server/queries/favourites";
import { getStationOccupancy } from "@/server/queries/occupancy";
import { getStationDetail } from "@/server/queries/stops";

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const [station, board, occupancies, favouriteId] = await Promise.all([
    getStationDetail(stationId),
    getArrivalBoard(stationId),
    getStationOccupancy(stationId),
    session ? getFavouriteId(session.user.id, { stopId: stationId }) : Promise.resolve(null),
  ]);

  if (!station) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="network-grid flex items-start justify-between gap-3 rounded-3xl border border-white bg-white/85 p-6 shadow-soft sm:p-8">
        <div>
          <StopHierarchyBreadcrumb station={station} />
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#0a2540] sm:text-5xl">
            {station.name}
          </h1>
        </div>
        <FavouriteButton target={{ stopId: station.id }} initialFavouriteId={favouriteId} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Lines</h2>
        <div className="flex flex-wrap gap-2">
          {station.lines.map((line) => (
            <Link key={line.id} href={`/lines/${line.id}`}>
              <LineBadge name={line.name} color={line.color} />
            </Link>
          ))}
        </div>
      </div>

      {station.children.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#0a2540]">Platforms</h2>
          <ul className="flex flex-col gap-1">
            {station.children.map((child) => (
              <li key={child.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                {child.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {station.lat !== null && station.lon !== null && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Location</h2>
          <div className="overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-soft">
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
              className="h-[300px] w-full rounded-2xl"
              maxZoom={15}
            />
          </div>
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
