/*
 * The signup deadline: the end of 14 November 2026, Central time (Carter,
 * 27 October 2026). The one value every rule tied to that day reads, so
 * moving it moves all of them:
 *
 *   - new bookings close on both Telluride departures (signupsClosed, read
 *     by createBooking, /bookings/new and the trip pages);
 *   - the December departure's balance is charged that day
 *     (INSTALLMENT_DATES_BY_START, lib/installments.ts);
 *   - an ambassador's booking counts toward their five only if it was paid
 *     in full by then (lib/ambassadors.ts);
 *   - the ambassador codes expire then (their expires_at, set to the same
 *     instant in scripts/ambassador-codes.sql and by the admin page).
 *
 * 05:59:59 UTC is 11:59:59 PM Central Standard Time, which is in force on
 * 14 November (daylight saving ends 1 November 2026).
 *
 * Pure and client-safe, apart from the preview switch below.
 */
export const SIGNUP_DEADLINE = new Date("2026-11-15T05:59:59Z");

/** The deadline's own time zone: the day it ends on is read there. */
export const DEADLINE_TIME_ZONE = "America/Chicago";

/** The calendar day (YYYY-MM-DD) `date` falls on in Central time. */
export function dayInCentral(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEADLINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "2026-11-14": the day the deadline ends, for schedules keyed on dates. */
export const SIGNUP_DEADLINE_DAY = dayInCentral(SIGNUP_DEADLINE);

/** "November 14", for copy. */
export const SIGNUP_DEADLINE_LABEL = new Date(`${SIGNUP_DEADLINE_DAY}T12:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Whether new bookings are closed: the deadline has passed.
 *
 * SIGNUPS_CLOSED_PREVIEW=1 closes them early on a local or preview build, so
 * the closed screens can be seen and the createBooking refusal tried before
 * the day. Ignored on Vercel production, where only the clock decides.
 */
export function signupsClosed(now: Date = new Date()): boolean {
  if (process.env.SIGNUPS_CLOSED_PREVIEW === "1" && process.env.VERCEL_ENV !== "production") return true;
  return now.getTime() > SIGNUP_DEADLINE.getTime();
}
