import { DemoProvider } from "@/server/providers/demo/demo-provider";
import {
  type ProviderLine,
  type ProviderServiceStatus,
  ProviderServiceStatusSchema,
  type ProviderStop,
  type TransitProvider,
} from "@/server/providers/types";

export interface SimulationScenarioEntry {
  lineExternalId: string;
  // Same vocabulary TfL/demo use — normalize.ts's STATUS_SEVERITY_LABEL_MAP
  // buckets it into the domain ServiceStatusLevel enum, no separate
  // vocabulary needed for simulated data.
  statusSeverityLabel: string;
  description?: string;
}

// A single, explicit, developer-controlled scenario — not randomised, so
// results are reproducible and explainable, matching this project's
// general aversion to anything that looks more sophisticated than it is.
// See DECISIONS.md ADR-024.
const DEFAULT_SCENARIO: SimulationScenarioEntry[] = [
  {
    lineExternalId: "central",
    statusSeverityLabel: "Severe Delays",
    description: "Simulated scenario: signal failure at Bank (not a real disruption).",
  },
];

/**
 * Implements the same TransitProvider interface as TflProvider/DemoProvider
 * — proves the abstraction holds for a data source that isn't measuring
 * anything real at all. Reuses DemoProvider's network structure
 * (lines/stops) via composition rather than duplicating fixtures; only
 * getServiceStatus actually simulates anything, and every line not named
 * in the scenario reports GOOD_SERVICE (never silently inherits whatever
 * status another provider happens to report for "the same" line — this
 * provider's lines are its own separate (source, externalRef) rows once
 * ingested, never the same DB row as a demo/tfl line).
 *
 * `sourceName = "simulation"` tags every ingested row with that
 * provenance (ADR-005); combined with the UI's `SimulatedTag` wherever a
 * line's status is shown, this is what satisfies AGENTS.md's "simulation
 * data must always be visually distinguishable from live data" rule.
 */
export class SimulationProvider implements TransitProvider {
  readonly sourceName = "simulation";
  private readonly demo = new DemoProvider();
  private readonly scenario: SimulationScenarioEntry[];

  constructor(options?: { scenario?: SimulationScenarioEntry[] }) {
    this.scenario = options?.scenario ?? DEFAULT_SCENARIO;
  }

  async getLines(): Promise<ProviderLine[]> {
    return this.demo.getLines();
  }

  async getStops(): Promise<ProviderStop[]> {
    return this.demo.getStops();
  }

  async getServiceStatus(): Promise<ProviderServiceStatus[]> {
    const lines = await this.demo.getLines();
    const now = new Date().toISOString();
    const scenarioByLine = new Map(this.scenario.map((entry) => [entry.lineExternalId, entry]));

    return lines.map((line) => {
      const entry = scenarioByLine.get(line.externalId);
      return ProviderServiceStatusSchema.parse({
        lineExternalId: line.externalId,
        statusSeverityLabel: entry?.statusSeverityLabel ?? "Good Service",
        description: entry?.description,
        recordedAt: now,
      });
    });
  }
}
