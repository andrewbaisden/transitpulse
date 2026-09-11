import { formatInTimeZone } from "date-fns-tz";

/**
 * All timestamps are stored as UTC (Postgres TIMESTAMPTZ / JS Date). This
 * module is the single place that converts to Europe/London wall-clock time
 * for presentation, so callers never import date-fns-tz directly — keeps
 * the door open to swap the underlying library later without touching
 * every call site.
 */
const LONDON_TIME_ZONE = "Europe/London";

export function formatLondonTime(date: Date, pattern = "HH:mm"): string {
  return formatInTimeZone(date, LONDON_TIME_ZONE, pattern);
}

export function formatLondonDateTime(date: Date): string {
  return formatInTimeZone(date, LONDON_TIME_ZONE, "d MMM yyyy, HH:mm");
}

/** e.g. "12 sec ago", "4 min ago" — for realtime/freshness indicators. */
export function formatRelativeToNow(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} sec ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr ago`;

  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}
