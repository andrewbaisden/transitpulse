import { prisma } from "@/server/db/client";

export interface SearchResult {
  type: "line" | "stop";
  id: string;
  name: string;
  subtitle: string;
}

/**
 * Plain Postgres ILIKE across Stop/Line names, backed by the @@index([name])
 * on Stop. Deliberately not pg_trgm/Elasticsearch yet — see DECISIONS.md
 * ADR-008 for the upgrade trigger.
 */
export async function searchStopsAndLines(term: string): Promise<SearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const [lines, stops] = await Promise.all([
    prisma.line.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.stop.findMany({
      where: { name: { contains: trimmed, mode: "insensitive" } },
      take: 8,
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    ...lines.map(
      (line): SearchResult => ({
        type: "line",
        id: line.id,
        name: line.name,
        subtitle: line.mode.replace("_", " "),
      }),
    ),
    ...stops.map(
      (stop): SearchResult => ({
        type: "stop",
        id: stop.id,
        name: stop.name,
        subtitle: stop.stopType,
      }),
    ),
  ];
}
