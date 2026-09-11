import { z } from "zod";

/**
 * Provider boundary types.
 *
 * These describe what ANY transit data provider returns — still
 * provider-agnostic, but closer to "raw feed" shape than the TransitPulse
 * domain (external ids present, minimal transformation). A future TfL
 * adapter (Phase 4) and a future Simulation provider (Phase 13) both
 * implement `TransitProvider` and return data matching these schemas; the
 * DemoProvider used in Phase 1-3 is just the first implementation.
 *
 * Every provider method's raw output is validated against the schemas below
 * BEFORE normalization (see server/domain/ingestion). This is what lets the
 * demo fixtures exercise the exact same failure mode a malformed TfL
 * response would hit later.
 */

export const ProviderStopTypeSchema = z.enum(["HUB", "STATION", "PLATFORM"]);
export type ProviderStopType = z.infer<typeof ProviderStopTypeSchema>;

export const ProviderLineSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  modeExternalId: z.string().min(1),
  color: z.string().optional(),
});
export type ProviderLine = z.infer<typeof ProviderLineSchema>;

export const ProviderStopLineSchema = z.object({
  lineExternalId: z.string().min(1),
  // Position of this stop along the line, in the provider's own ordering.
  // Not modelled as a separate "route" concept yet — see DECISIONS.md.
  sequence: z.number().int().nonnegative(),
});
export type ProviderStopLine = z.infer<typeof ProviderStopLineSchema>;

export const ProviderStopSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  stopType: ProviderStopTypeSchema,
  parentExternalId: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  lines: z.array(ProviderStopLineSchema),
});
export type ProviderStop = z.infer<typeof ProviderStopSchema>;

export const ProviderServiceStatusSchema = z.object({
  lineExternalId: z.string().min(1),
  statusSeverityLabel: z.string().min(1),
  description: z.string().optional(),
  recordedAt: z.iso.datetime({ offset: true }),
});
export type ProviderServiceStatus = z.infer<typeof ProviderServiceStatusSchema>;

// Optional, forward-looking shapes. No provider implements these in
// Phase 1-3 — they exist only so the `TransitProvider` interface below can
// declare the methods as optional without inventing them later.
export const ProviderArrivalSchema = z.object({
  stopExternalId: z.string().min(1),
  lineExternalId: z.string().min(1),
  destinationName: z.string().min(1),
  expectedArrival: z.iso.datetime({ offset: true }),
});
export type ProviderArrival = z.infer<typeof ProviderArrivalSchema>;

export const ProviderVehicleSchema = z.object({
  vehicleExternalId: z.string().min(1),
  lineExternalId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  bearing: z.number().min(0).max(359).optional(),
  recordedAt: z.iso.datetime({ offset: true }),
});
export type ProviderVehicle = z.infer<typeof ProviderVehicleSchema>;

export const ProviderOccupancySchema = z.object({
  stopExternalId: z.string().min(1),
  level: z.string().min(1),
  recordedAt: z.iso.datetime({ offset: true }),
});
export type ProviderOccupancy = z.infer<typeof ProviderOccupancySchema>;

/**
 * The provider abstraction. TransitPulse's domain never depends on any
 * concrete provider's response shapes — only on this interface.
 *
 * `getArrivals` / `getVehicles` / `getOccupancy` are optional because not
 * every provider (or phase) implements them yet — see AGENTS.md for the
 * rule that new provider methods only get added when a real phase needs
 * them, never speculatively.
 */
export interface TransitProvider {
  readonly sourceName: string; // "demo" | "tfl" | "simulation", etc.
  getLines(): Promise<ProviderLine[]>;
  getStops(): Promise<ProviderStop[]>;
  getServiceStatus(): Promise<ProviderServiceStatus[]>;
  getArrivals?(stopExternalId: string): Promise<ProviderArrival[]>;
  getVehicles?(): Promise<ProviderVehicle[]>;
  getOccupancy?(): Promise<ProviderOccupancy[]>;
}
