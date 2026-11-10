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
 * The ambassador codes expire at the last close of anything on sale,
 * LAST_BOOKING_CLOSE, because one code now sells Telluride and spring break
 * (3 November 2026). A week past its own close still refuses the booking.
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

const TELLURIDE_CLOSES: Readonly<Record<string, Date>> = {
  // Telluride, December 14 to 18, 2026
  "2026-12-14": SIGNUP_DEADLINE,
  // Telluride, January 4 to 8, 2027
  "2027-01-04": JANUARY_DEADLINE,
};

/*
 * Spring break, Zemi Miches (3 November 2026).
 *
 * Carter gave the trip dates, the $100 deposit and the January 8 balance
 * (lib/installments.ts), not the closes, and the Group Agreement will set the
 * hotel's real cut-off. Zemi's proposal takes "no deviations" within 45 days of
 * arrival, January 22 and January 29, so each week closes seven days before
 * that and the rooming list has the week between. From January 5 a booking is
 * paid in full (PAY_IN_FULL_FROM_BY_START), so between then and the close
 * people can still join, paying the whole price. The end of the day Central;
 * CST, UTC-6, is in force on both.
 */
const SPRING_BREAK_CLOSES: Readonly<Record<string, Date>> = {
  // March 8 to 12, 2027: the end of January 15.
  "2027-03-08": new Date("2027-01-16T05:59:59Z"),
  // March 15 to 19, 2027: the end of January 22.
  "2027-03-15": new Date("2027-01-23T05:59:59Z"),
};

/**
 * Spring break is on sale (Carter, 10 November 2026). What this held back while
 * false: the note above scheduleConfirmed in lib/installments.ts.
 */
export const SPRING_BREAK_DATES_CONFIRMED = true;

/** The start dates of the spring break departures, for copy that lists them. */
export const SPRING_BREAK_STARTS: readonly string[] = Object.keys(SPRING_BREAK_CLOSES).sort();

/**
 * When each departure stops taking bookings, keyed by the trip's start_date.
 * A departure not listed closes at SIGNUP_DEADLINE, which has already passed
 * or is about to: a new departure stays shut until someone gives it a date.
 * Add a line for every new departure.
 */
export const BOOKINGS_CLOSE_BY_START: Readonly<Record<string, Date>> = {
  ...TELLURIDE_CLOSES,
  ...SPRING_BREAK_CLOSES,
};

/*
 * LAST_SIGNUP_DEADLINE is Telluride's last close, and only Telluride's. The
 * Telluride ambassador program, the settle and release on /admin/ambassadors
 * and every "Signups closed on" line read it, so spring break's later dates
 * must not move it (3 November 2026). The close of everything on sale is
 * LAST_BOOKING_CLOSE, which is also when the ambassador codes expire.
 */
export const LAST_SIGNUP_DEADLINE = new Date(Math.max(...Object.values(TELLURIDE_CLOSES).map((d) => d.getTime())));
export const LAST_SIGNUP_DEADLINE_DAY = dayInCentral(LAST_SIGNUP_DEADLINE);
/** "December 4". */
export const LAST_SIGNUP_DEADLINE_LABEL = labelFor(LAST_SIGNUP_DEADLINE);

/** The last close of anything on sale, on any line: after it nothing is booked. */
export const LAST_BOOKING_CLOSE = new Date(Math.max(...Object.values(BOOKINGS_CLOSE_BY_START).map((d) => d.getTime())));
/** "January 22". */
export const LAST_BOOKING_CLOSE_LABEL = labelFor(LAST_BOOKING_CLOSE);

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

/*
 * The last close of what is actually on sale. Spring break counts only once its
 * dates are confirmed: until then it cannot be booked, so from 5 December nothing
 * can, and the pages have to say signups closed rather than "nothing open yet".
 */
const LAST_SALE_CLOSE = SPRING_BREAK_DATES_CONFIRMED ? LAST_BOOKING_CLOSE : LAST_SIGNUP_DEADLINE;
/** The date for "Signups closed on": "December 4" until spring break is on sale. */
export const SIGNUPS_CLOSED_LABEL = labelFor(LAST_SALE_CLOSE);

/** Whether new bookings are closed on every departure on sale, on any line. */
export function signupsClosed(now: Date = new Date()): boolean {
  if (previewClosed()) return true;
  return now.getTime() > LAST_SALE_CLOSE.getTime();
}

/** Whether Telluride has finished selling, both weeks. Spring break stays open past this. */
export function tellurideClosed(now: Date = new Date()): boolean {
  if (previewClosed()) return true;
  return now.getTime() > LAST_SIGNUP_DEADLINE.getTime();
}
