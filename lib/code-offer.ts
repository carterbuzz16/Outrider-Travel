import { TRIP_TIME_ZONE, todayInMountain } from "@/lib/mountain-time";

/*
 * -- $100 off by email ------------------------------------------------------------
 *
 * The offer on /telluride since 1 October 2026: type an email address, get a
 * single-use $100 code of your own, on screen and by email, good for a week.
 *
 * It replaced a pop-up that offered the new-account credit
 * (lib/welcome-credit.ts) to whoever made an account inside it: a name, an
 * email, then a six-digit code fetched from the inbox, for $100 that ran out in
 * 24 hours. In the two days the Instagram ads ran against it, no visitor
 * started it. A group trip is decided with friends and usually a parent, which
 * a day does not allow for, and leaving Instagram's browser for a code is
 * where a phone visitor gives up. So this asks for one field, shows the code
 * straight away, and gives the group a week.
 *
 * Where the pieces live:
 *
 *   - app/code-offer-actions.ts   issues the code (one per address, ever)
 *   - components/WelcomeCredit.tsx the sheet, and the line under Reserve
 *   - lib/code-offer-server.ts    the cookie that carries the code to checkout
 *   - app/api/cron/code-offer-reminders  "two days left" and "last day"
 *
 * The code is an ordinary discount_codes row (lib/discount-codes.ts), so
 * checkout prices, claims and frees it exactly as it does a giveaway code,
 * and it combines with the pay-in-full discount and with nothing else.
 *
 * The deadline is real and the same everywhere it is stated: the end of the
 * seventh day after asking, Mountain Time, the clock the trips run on. It is
 * the code's expires_at, so a checkout after it is charged in full.
 *
 * Pure and client-safe: the sheet and the emails both format the deadline
 * from here.
 */

export const OFFER_AMOUNT = 100;
export const OFFER_DAYS = 7;

/** The cookie holding the code for checkout (lib/code-offer-server.ts). */
export const OFFER_COOKIE = "outrider_offer";

/** What the codes start with. The random part is what keeps them unguessable. */
export const OFFER_CODE_PREFIX = "TELLURIDE";

/**
 * True for a code this offer issued, the only kind the cookie may carry and
 * the kind checkout does not count against its guessing caps
 * (lib/code-offer-server.ts says why).
 */
export function isOfferCode(code: string | null | undefined): boolean {
  return Boolean(code?.startsWith(OFFER_CODE_PREFIX));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The instant a Mountain Time calendar date ends (23:59:59 there), for a date
 * as YYYY-MM-DD. Works out Denver's UTC offset on that day, so it is right on
 * both sides of a daylight-saving change.
 */
export function endOfMountainDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 23, 59, 59);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TRIP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  // `wall - guess` is Denver's offset (negative); undo it.
  return new Date(guess - (wall - guess));
}

/**
 * When a code asked for at `now` stops working: the end of the day seven
 * calendar days on, Mountain Time. Counted on the calendar date, not as 168
 * hours, which in the week the clocks change lands a day early or late.
 */
export function offerExpiry(now: Date = new Date()): Date {
  const [y, m, d] = todayInMountain(now).split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1, d + OFFER_DAYS)).toISOString().slice(0, 10);
  return endOfMountainDay(last);
}

/** "Thursday, October 8": the last day the code works, as the sheet and the emails say it. */
export function formatOfferDeadline(expiresAt: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TRIP_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(expiresAt));
}

/** "Thursday": the same day, shorter, for a subject line. */
export function formatOfferWeekday(expiresAt: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TRIP_TIME_ZONE, weekday: "long" }).format(new Date(expiresAt));
}

/**
 * Whole Mountain Time days from today to the last day: 0 on the last day
 * itself, negative once it has passed. Calendar days, not 24-hour periods, so
 * the reminders say "Thursday" on the right morning whatever the hour.
 */
export function offerDaysLeft(expiresAt: string | Date, now: Date = new Date()): number {
  const last = todayInMountain(new Date(expiresAt));
  const today = todayInMountain(now);
  return Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}
