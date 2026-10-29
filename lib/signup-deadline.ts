/*
 * When bookings close, by departure (Carter, 29 October 2026: "split by
 * trip"): December's at the end of 14 November, Central, the day its balance
 * is charged; January's at the end of 4 December, when January money is due.
 * BOOKINGS_CLOSE_BY_START below holds both; departureClosed asks about one
 * trip, signupsClosed about all of them.
 *
 * SIGNUP_DEADLINE is December's (it was the one deadline for both until 29
 * October). Every rule tied to that day reads it, so moving it moves all of
 * them:
 *
 *   - new December bookings close (departureClosed);
 *   - the December departure's balance is charged that day
 *     (INSTALLMENT_DATES_BY_START, lib/installments.ts);
 *   - a December friend counts toward an ambassador's five only if paid in
 *     full by then (lib/ambassador-program.ts; January friends by 4 December).
 *
 * The ambassador codes now expire at the last close, LAST_SIGNUP_DEADLINE, so
 * they keep crediting January bookings.
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

/** The end of 4 December 2026, Central (CST, UTC-6): January's bookings close. */
export const JANUARY_DEADLINE = new Date("2026-12-05T05:59:59Z");

/**
 * When each departure stops taking bookings, keyed by the trip's start_date.
 * A departure not listed closes at SIGNUP_DEADLINE. Add a line for any new
 * departure that closes on its own date.
 */
export const BOOKINGS_CLOSE_BY_START: Readonly<Record<string, Date>> = {
  // Telluride, December 14 to 18, 2026
  "2026-12-14": SIGNUP_DEADLINE,
  // Telluride, January 4 to 8, 2027
  "2027-01-04": JANUARY_DEADLINE,
};

/** The last departure's close: after it nothing is booked, and the ambassador codes expire. */
export const LAST_SIGNUP_DEADLINE = new Date(
  Math.max(SIGNUP_DEADLINE.getTime(), ...Object.values(BOOKINGS_CLOSE_BY_START).map((d) => d.getTime())),
);
export const LAST_SIGNUP_DEADLINE_DAY = dayInCentral(LAST_SIGNUP_DEADLINE);
/** "December 4". */
export const LAST_SIGNUP_DEADLINE_LABEL = labelFor(LAST_SIGNUP_DEADLINE);

/** "November 14" for an instant, read in Central time. */
export function labelFor(instant: Date): string {
  return new Date(`${dayInCentral(instant)}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** When a departure (by its start_date) stops taking bookings. */
export function bookingsCloseAt(startDate: string | null | undefined): Date {
  return (startDate && BOOKINGS_CLOSE_BY_START[startDate]) || SIGNUP_DEADLINE;
}

/** "November 14" for December, "December 4" for January. */
export function closeLabel(startDate: string | null | undefined): string {
  return labelFor(bookingsCloseAt(startDate));
}

/**
 * SIGNUPS_CLOSED_PREVIEW=1 closes everything early on a local or preview
 * build, so the closed screens can be seen and the createBooking refusal tried
 * before the day. Ignored on Vercel production, where only the clock decides.
 */
function previewClosed(): boolean {
  return process.env.SIGNUPS_CLOSED_PREVIEW === "1" && process.env.VERCEL_ENV !== "production";
}

/** Whether this departure has stopped taking bookings. */
export function departureClosed(startDate: string | null | undefined, now: Date = new Date()): boolean {
  if (previewClosed()) return true;
  return now.getTime() > bookingsCloseAt(startDate).getTime();
}

/** Whether new bookings are closed on every departure: the last close has passed. */
export function signupsClosed(now: Date = new Date()): boolean {
  if (previewClosed()) return true;
  return now.getTime() > LAST_SIGNUP_DEADLINE.getTime();
}
