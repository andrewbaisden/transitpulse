import type {
  DomainArrival,
  DomainLine,
  DomainServiceStatus,
  DomainStop,
  ServiceStatusLevel,
  TransportMode,
} from "@/server/domain/types";
import type {
  ProviderArrival,
  ProviderLine,
  ProviderServiceStatus,
  ProviderStop,
} from "@/server/providers/types";

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

// The demo fixtures only exercise a handful of these. The rest are TfL's
// real status vocabulary for the rail modes TflProvider targets (Phase 4) —
// confirmed against /Line/Meta/Severity, not guessed — bucketed into our
// coarser 7-value domain enum. See DECISIONS.md ADR-014 for the judgment
// calls (e.g. "Closed"/"Not Running" -> SUSPENDED, "No Step Free Access" ->
// GOOD_SERVICE) — the original TfL label is preserved verbatim in
// `description`, so nothing is lost, only bucketed.
const STATUS_SEVERITY_LABEL_MAP: Record<string, ServiceStatusLevel> = {
  "good service": "GOOD_SERVICE",
  "no issues": "GOOD_SERVICE",
  "no exceptional delays": "GOOD_SERVICE",
  information: "GOOD_SERVICE",
  "no step free access": "GOOD_SERVICE",
  "minor delays": "MINOR_DELAYS",
  "reduced service": "MINOR_DELAYS",
  "change of frequency": "MINOR_DELAYS",
  diverted: "MINOR_DELAYS",
  "exit only": "MINOR_DELAYS",
  "issues reported": "MINOR_DELAYS",
  "severe delays": "SEVERE_DELAYS",
  "part suspended": "PART_CLOSURE",
  "part closure": "PART_CLOSURE",
  "part closed": "PART_CLOSURE",
  "planned closure": "PART_CLOSURE",
  suspended: "SUSPENDED",
  closed: "SUSPENDED",
  closure: "SUSPENDED",
  "service closed": "SUSPENDED",
  "not running": "SUSPENDED",
  "no service": "SUSPENDED",
  "special service": "SPECIAL_SERVICE",
  "bus service": "SPECIAL_SERVICE",
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

// No controlled vocabulary to translate here (unlike mode/status) — a
// straightforward field mapping, still kept as its own pure function for
// the same reason the others are: unit-testable without a live provider.
export function normalizeArrival(
  providerArrival: ProviderArrival,
  sourceName: string,
): DomainArrival {
  return {
    lineExternalRef: providerArrival.lineExternalId,
    destinationName: providerArrival.destinationName,
    expectedArrival: new Date(providerArrival.expectedArrival),
    source: sourceName,
  };
}
