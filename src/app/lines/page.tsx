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
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">Network</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#0a2540] sm:text-5xl">
          London lines
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-500">
          Browse every monitored service and check its latest recorded status.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/75 p-2 shadow-sm">
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "border-[#635bff] bg-[#635bff] text-white shadow-sm"
          : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-[#0a2540]"
      }`}
    >
      {label}
    </Link>
  );
}
