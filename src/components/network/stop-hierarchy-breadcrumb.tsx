import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { StationDetail } from "@/server/queries/stops";

export function StopHierarchyBreadcrumb({ station }: { station: StationDetail }) {
  if (!station.parent && station.children.length === 0) return null;

  return (
    <nav aria-label="Station hierarchy" className="flex flex-wrap items-center gap-1 text-sm">
      {station.parent && (
        <>
          <Link
            href={`/stations/${station.parent.id}`}
            className="text-muted-foreground hover:underline"
          >
            {station.parent.name}
          </Link>
          <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
        </>
      )}
      <span className="font-medium">{station.name}</span>
      {station.children.length > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          ({station.children.length} platform{station.children.length === 1 ? "" : "s"})
        </span>
      )}
    </nav>
  );
}
