/*
 * Timestamps in the back office, in Mountain Time.
 *
 * The departures are in Colorado and the post-booking emails already count
 * days in America/Denver (lib/email/post-booking.ts), so the admin reads
 * times the same way, and says so, rather than in whatever zone the server or
 * the phone happens to be in. Pure; used by server and client components.
 */

const STAMP = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const SHORT_STAMP = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Sep 18, 2026, 2:14 PM MT", or null for no timestamp. */
export function formatStamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${STAMP.format(date)} MT`;
}

/** "Sep 18, 2:14 PM", for dense table cells where the year is obvious. */
export function formatShortStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return SHORT_STAMP.format(date);
}
