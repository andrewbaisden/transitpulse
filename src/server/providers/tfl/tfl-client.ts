import { z } from "zod";

/**
 * Raw TfL Unified API response shapes — deliberately minimal (only the
 * fields TflProvider actually reads, not the full `$type`-laden entity).
 * These never leave `src/server/providers/tfl/` — see AGENTS.md's provider
 * boundary rule. TflProvider maps them onto the provider-agnostic
 * `Provider*` shapes in `providers/types.ts` before returning anything.
 */

export class TflProviderError extends Error {
  constructor(
    message: string,
    readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TflProviderError";
  }
}

export const TflLineRawSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modeName: z.string().min(1),
});

export const TflValidityPeriodRawSchema = z.object({
  fromDate: z.string().optional(),
});

export const TflLineStatusRawSchema = z.object({
  statusSeverityDescription: z.string().min(1),
  reason: z.string().optional(),
  validityPeriods: z.array(TflValidityPeriodRawSchema).optional().default([]),
});

export const TflLineWithStatusRawSchema = TflLineRawSchema.extend({
  lineStatuses: z.array(TflLineStatusRawSchema).optional().default([]),
});

export const TflMatchedStopRawSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
  parentId: z.string().optional(),
});

export const TflRouteSequenceRawSchema = z.object({
  stopPointSequences: z.array(
    z.object({
      stopPoint: z.array(TflMatchedStopRawSchema),
    }),
  ),
});

export const TflArrivalRawSchema = z.object({
  lineId: z.string().min(1),
  destinationName: z.string().min(1),
  expectedArrival: z.string(),
});

export const TflHubStopPointRawSchema = z.object({
  id: z.string().min(1),
  commonName: z.string().min(1),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

// TfL's Crowding response (verified against the live API, not just its
// Swagger spec, which describes a different shape) is a single StopPoint
// object whose `lines` array carries a `crowding.trainLoadings` entry per
// line — static historical data by 15-minute time slice, not live
// occupancy. `direction=all` returns separate inbound/outbound entries
// for the same time slice rather than merging them, and `value` can be 0
// (undocumented — not part of TfL's own stated 1-6 scale). See
// DECISIONS.md ADR-020 for how both are handled.
export const TflTrainLoadingRawSchema = z.object({
  timeSlice: z.string().min(1),
  value: z.number().int().min(0).max(6),
});

export const TflCrowdingLineRawSchema = z.object({
  id: z.string().min(1),
  crowding: z
    .object({
      trainLoadings: z.array(TflTrainLoadingRawSchema).optional().default([]),
    })
    .optional(),
});

export const TflCrowdingRawSchema = z.object({
  lines: z.array(TflCrowdingLineRawSchema).optional().default([]),
});

/** Strips `app_key` before a URL is ever included in a thrown error. */
function redact(url: string): string {
  const u = new URL(url);
  if (u.searchParams.has("app_key")) {
    u.searchParams.set("app_key", "***");
  }
  return u.toString();
}

export async function tflRequest<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new TflProviderError("TfL API request failed to send", {
      url: redact(url),
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (!response.ok) {
    throw new TflProviderError("TfL API request returned a non-OK status", {
      url: redact(url),
      status: response.status,
    });
  }

  const raw: unknown = await response.json();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new TflProviderError("TfL API response failed schema validation", {
      url: redact(url),
      issues: parsed.error.issues,
    });
  }

  return parsed.data;
}
