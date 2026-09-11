import { NetworkMap } from "@/components/network/network-map";
import { getMapStops } from "@/server/queries/map";

export default async function MapPage() {
  const stops = await getMapStops();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Network Map</h1>
        <p className="text-sm text-muted-foreground">
          {stops.length} station{stops.length === 1 ? "" : "s"} plotted by their ingested
          coordinates. Click a marker for the station page.
        </p>
      </div>

      {stops.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No station coordinates yet. Run <code className="font-mono">pnpm db:seed</code> to load
          demo data.
        </div>
      ) : (
        <NetworkMap stops={stops} className="h-[70vh] w-full rounded-lg border" />
      )}
    </div>
  );
}
