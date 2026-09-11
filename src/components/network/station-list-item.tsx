import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { StationSummary } from "@/server/queries/stops";

export function StationListItem({ station }: { station: StationSummary }) {
  return (
    <Link href={`/stations/${station.id}`} className="block" data-testid="station-list-item">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center justify-between gap-4">
          <span className="font-medium">{station.name}</span>
          <div className="flex flex-wrap justify-end gap-1">
            {station.lineNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
