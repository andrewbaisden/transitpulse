import { ArrowUpRight, TrainFront } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { StationSummary } from "@/server/queries/stops";

export function StationListItem({ station }: { station: StationSummary }) {
  return (
    <Link
      href={`/stations/${station.id}`}
      className="group block h-full"
      data-testid="station-list-item"
    >
      <Card className="h-full gap-0 rounded-2xl bg-white/90 py-0 ring-slate-200/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_36px_rgb(10_37_64/10%)] group-hover:ring-slate-300">
        <CardContent className="flex h-full items-center gap-3.5 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef1ff] text-[#635bff]">
            <TrainFront className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-semibold tracking-[-0.01em] text-[#0a2540]">{station.name}</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {station.lineNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-[#635bff] group-hover:text-white">
            <ArrowUpRight className="size-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
