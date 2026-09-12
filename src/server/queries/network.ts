import { prisma } from "@/server/db/client";
import type { ServiceStatusLevel, TransportMode } from "@/server/domain/types";

export interface LineWithStatus {
  id: string;
  name: string;
  mode: TransportMode;
  color: string | null;
  // Which provider this line came from ("tfl" | "demo" | "simulation") —
  // the UI uses this to badge simulated data distinctly. Never blend
  // simulation with live data silently. See DECISIONS.md ADR-024.
  source: string;
  status: ServiceStatusLevel;
  statusDescription: string | null;
  statusRecordedAt: Date;
}

export interface NetworkOverview {
  networkName: string;
  lines: LineWithStatus[];
}

/**
 * Each line's most recent ServiceStatus row (ServiceStatus is append-only,
 * so "current status" always means the latest recordedAt per line).
 */
export async function getNetworkOverview(): Promise<NetworkOverview | null> {
  const network = await prisma.network.findFirst({
    include: {
      lines: {
        include: {
          serviceStatus: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!network) return null;

  return {
    networkName: network.name,
    lines: network.lines.map((line) => {
      const latest = line.serviceStatus[0];
      return {
        id: line.id,
        name: line.name,
        mode: line.mode as TransportMode,
        color: line.color,
        source: line.source,
        status: (latest?.status ?? "UNKNOWN") as ServiceStatusLevel,
        statusDescription: latest?.description ?? null,
        statusRecordedAt: latest?.recordedAt ?? line.updatedAt,
      };
    }),
  };
}
