import type {
  DomainLine,
  DomainServiceStatus,
  DomainStop,
  ServiceStatusLevel,
  TransportMode,
} from "@/server/domain/types";
import type { ProviderLine, ProviderServiceStatus, ProviderStop } from "@/server/providers/types";

/**
 * Pure, provider-agnostic mapping from provider-normalized shapes to the
 * TransitPulse domain. No I/O, no Prisma — unit-testable in isolation from
 * any concrete provider, which is what proves the provider boundary
 * actually holds.
 *
 * Mode/status vocabularies below use TfL's own labels (e.g. "tube",
 * "Good Service") because the DemoProvider fixtures are written in that
 * vocabulary deliberately, so the Phase 4 TfL adapter reuses this exact
 * mapping table instead of inventing a second one.
 */

export class NormalizationError extends Error {
  constructor(
    message: string,
    readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NormalizationError";
  }
}

const MODE_EXTERNAL_ID_MAP: Record<string, TransportMode> = {
  tube: "TUBE",
  overground: "OVERGROUND",
  "elizabeth-line": "ELIZABETH_LINE",
  dlr: "DLR",
  bus: "BUS",
  tram: "TRAM",
};

const STATUS_SEVERITY_LABEL_MAP: Record<string, ServiceStatusLevel> = {
  "good service": "GOOD_SERVICE",
  "minor delays": "MINOR_DELAYS",
  "severe delays": "SEVERE_DELAYS",
  "part suspended": "PART_CLOSURE",
  "part closure": "PART_CLOSURE",
  suspended: "SUSPENDED",
  "planned closure": "PART_CLOSURE",
  "special service": "SPECIAL_SERVICE",
};

export function normalizeLine(providerLine: ProviderLine, sourceName: string): DomainLine {
  const mode = MODE_EXTERNAL_ID_MAP[providerLine.modeExternalId];
  if (!mode) {
    throw new NormalizationError("Unrecognized provider mode", {
      sourceName,
      modeExternalId: providerLine.modeExternalId,
    });
  }

  return {
    name: providerLine.name,
    mode,
    color: providerLine.color ?? null,
    source: sourceName,
    externalRef: providerLine.externalId,
  };
}

export function normalizeStop(providerStop: ProviderStop, sourceName: string): DomainStop {
  return {
    name: providerStop.name,
    stopType: providerStop.stopType,
    parentExternalRef: providerStop.parentExternalId ?? null,
    lat: providerStop.lat ?? null,
    lon: providerStop.lon ?? null,
    source: sourceName,
    externalRef: providerStop.externalId,
    lines: providerStop.lines.map((line) => ({
      lineExternalRef: line.lineExternalId,
      sequence: line.sequence,
    })),
  };
}

export function normalizeServiceStatus(
  providerStatus: ProviderServiceStatus,
  sourceName: string,
): DomainServiceStatus {
  const status = STATUS_SEVERITY_LABEL_MAP[providerStatus.statusSeverityLabel.toLowerCase()];
  if (!status) {
    throw new NormalizationError("Unrecognized service status severity", {
      sourceName,
      statusSeverityLabel: providerStatus.statusSeverityLabel,
    });
  }

  return {
    lineExternalRef: providerStatus.lineExternalId,
    status,
    description: providerStatus.description ?? null,
    source: sourceName,
    recordedAt: new Date(providerStatus.recordedAt),
  };
}
