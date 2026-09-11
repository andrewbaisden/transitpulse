import Link from "next/link";
import { LineCard } from "@/components/network/line-card";
import { modeLabel } from "@/components/network/mode-icon";
import type { TransportMode } from "@/server/domain/types";
import { getAllLines } from "@/server/queries/lines";

const MODES: TransportMode[] = ["TUBE", "OVERGROUND", "ELIZABETH_LINE", "DLR", "BUS", "TRAM"];

export default async function LinesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const modeFilter = MODES.includes(mode as TransportMode) ? (mode as TransportMode) : undefined;
  const lines = await getAllLines(modeFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lines</h1>
        <p className="text-sm text-muted-foreground">All lines across the network.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/lines" active={!modeFilter} label="All" />
        {MODES.map((m) => (
          <FilterLink
            key={m}
            href={`/lines?mode=${m}`}
            active={modeFilter === m}
            label={modeLabel(m)}
          />
        ))}
      </div>

      {lines.length === 0 ? (
        <p className="text-muted-foreground">No lines match this filter.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lines.map((line) => (
            <LineCard key={line.id} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
