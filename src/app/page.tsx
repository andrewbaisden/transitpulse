import { LineCard } from "@/components/network/line-card";
import { getNetworkOverview } from "@/server/queries/network";

// Renders "Updated X ago" from live data — must not be frozen into a
// build-time static page.
export const dynamic = "force-dynamic";

export default async function NetworkOverviewPage() {
  const overview = await getNetworkOverview();

  if (!overview) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No network data yet. Run <code className="font-mono">pnpm db:seed</code> to load demo data.
      </div>
    );
  }

  const goodService = overview.lines.filter((line) => line.status === "GOOD_SERVICE").length;
  const minorDelays = overview.lines.filter((line) => line.status === "MINOR_DELAYS").length;
  const severeIssues = overview.lines.filter((line) =>
    ["SEVERE_DELAYS", "PART_CLOSURE", "SUSPENDED"].includes(line.status),
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{overview.networkName}</p>
        <h1 className="text-3xl font-bold tracking-tight">Live Network</h1>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat label="Good Service" value={goodService} />
        <SummaryStat label="Minor Delays" value={minorDelays} />
        <SummaryStat label="Severe Issues" value={severeIssues} />
      </dl>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Lines</h2>
        <div className="flex flex-col gap-2">
          {overview.lines.map((line) => (
            <LineCard key={line.id} line={line} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}
