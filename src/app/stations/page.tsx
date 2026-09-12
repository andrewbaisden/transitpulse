import { StationListItem } from "@/components/network/station-list-item";
import { getAllStations } from "@/server/queries/stops";

export default async function StationsPage() {
  const stations = await getAllStations();

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">Network</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#0a2540] sm:text-5xl">
          Stations
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-500">
          {stations.length} station{stations.length === 1 ? "" : "s"} across the network.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {stations.map((station) => (
          <StationListItem key={station.id} station={station} />
        ))}
      </div>
    </div>
  );
}
