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
