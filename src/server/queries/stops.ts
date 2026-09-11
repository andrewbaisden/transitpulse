import { prisma } from "@/server/db/client";

export interface StationSummary {
  id: string;
  name: string;
  lineNames: string[];
}

/**
 * STATION/HUB level only — individual platforms aren't listed separately,
 * they're reached via their parent station's detail page.
 */
export async function getAllStations(): Promise<StationSummary[]> {
  const stops = await prisma.stop.findMany({
    where: { stopType: { in: ["STATION", "HUB"] } },
    include: { lines: { include: { line: true } } },
    orderBy: { name: "asc" },
  });

  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    lineNames: [...new Set(stop.lines.map((ls) => ls.line.name))],
  }));
}

export interface StationLine {
  id: string;
  name: string;
  mode: string;
  color: string | null;
}

export interface StationDetail {
  id: string;
  name: string;
  stopType: string;
  lat: number | null;
  lon: number | null;
  lines: StationLine[];
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; stopType: string }[];
}

export async function getStationDetail(stationId: string): Promise<StationDetail | null> {
  const stop = await prisma.stop.findUnique({
    where: { id: stationId },
    include: {
      lines: { include: { line: true } },
      parent: true,
      children: true,
    },
  });

  if (!stop) return null;

  return {
    id: stop.id,
    name: stop.name,
    stopType: stop.stopType,
    lat: stop.lat,
    lon: stop.lon,
    lines: [...new Map(stop.lines.map((ls) => [ls.line.id, ls.line])).values()].map((line) => ({
      id: line.id,
      name: line.name,
      mode: line.mode,
      color: line.color,
    })),
    parent: stop.parent ? { id: stop.parent.id, name: stop.parent.name } : null,
    children: stop.children.map((child) => ({
      id: child.id,
      name: child.name,
      stopType: child.stopType,
    })),
  };
}
