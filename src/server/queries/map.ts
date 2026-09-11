import { prisma } from "@/server/db/client";

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  // First associated line's colour, for the marker — reuses the same
  // per-line brand colours already shown elsewhere (LineBadge) rather than
  // inventing a separate mode-colour palette.
  lineColor: string | null;
}

/**
 * STATION/HUB level only, and only rows with coordinates — a stop with no
 * lat/lon (schema allows it) is simply omitted from the map rather than
 * plotted at a fabricated position.
 */
export async function getMapStops(): Promise<MapStop[]> {
  const stops = await prisma.stop.findMany({
    where: {
      stopType: { in: ["STATION", "HUB"] },
      lat: { not: null },
      lon: { not: null },
    },
    include: { lines: { include: { line: true }, take: 1 } },
  });

  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    // Non-null by the where clause above; Prisma's type can't express that.
    lat: stop.lat as number,
    lon: stop.lon as number,
    lineColor: stop.lines[0]?.line.color ?? null,
  }));
}
