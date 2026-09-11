import { StationListItem } from "@/components/network/station-list-item";
import { getAllStations } from "@/server/queries/stops";

export default async function StationsPage() {
  const stations = await getAllStations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
        <p className="text-sm text-muted-foreground">
          {stations.length} station{stations.length === 1 ? "" : "s"} across the network.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {stations.map((station) => (
          <StationListItem key={station.id} station={station} />
        ))}
      </div>
    </div>
  );
}
