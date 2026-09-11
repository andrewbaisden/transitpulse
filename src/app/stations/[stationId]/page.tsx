import Link from "next/link";
import { notFound } from "next/navigation";
import { LineBadge } from "@/components/network/line-badge";
import { StopHierarchyBreadcrumb } from "@/components/network/stop-hierarchy-breadcrumb";
import { getStationDetail } from "@/server/queries/stops";

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const station = await getStationDetail(stationId);

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

      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Live arrivals, crowding, and reliability metrics for this station arrive in later phases
        (see the project roadmap in ARCHITECTURE.md) — Phase 1-3 covers the static network explorer
        only.
      </div>
    </div>
  );
}
