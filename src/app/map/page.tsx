import { NetworkMap } from "@/components/network/network-map";
import { getMapStops } from "@/server/queries/map";

export default async function MapPage() {
  const stops = await getMapStops();

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">Explore</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#0a2540] sm:text-5xl">
          Network map
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-500">
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
        <div className="overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-soft">
          <NetworkMap stops={stops} className="h-[70vh] w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
