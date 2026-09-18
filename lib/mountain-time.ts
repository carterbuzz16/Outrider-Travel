/**
 * "Today", as the trips count it.
 *
 * Every departure is in Colorado, and a trip's start_date is a calendar date
 * there. The server runs in UTC, which is six or seven hours ahead: read in
 * UTC, a trip starting tomorrow in Telluride is already "today" from late
 * afternoon Mountain Time, and a trip starting today is still "tomorrow" for
 * the first hours after midnight UTC. So the date is taken in America/Denver.
 *
 * Pure and client-safe.
 */
export const TRIP_TIME_ZONE = "America/Denver";

/** Today's date in Mountain Time, as YYYY-MM-DD (the shape start_date is stored in). */
export function todayInMountain(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TRIP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * True once a trip can no longer be booked: it starts today or has started,
 * Mountain Time. A traveler cannot put a deposit on a trip that leaves today.
 */
export function hasDeparted(startDate: string, now: Date = new Date()): boolean {
  return startDate.slice(0, 10) <= todayInMountain(now);
}
