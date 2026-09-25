import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import confirmationTemplate from "@/lib/email/templates/confirmation";
import chaseTemplate from "@/lib/email/templates/chase";
import { renderTemplate, TemplateRenderError, type TemplateVariables } from "@/lib/email/render-template";
import {
  getFromAddress,
  renderBookingConfirmationEmail,
  sendBookingConfirmationEmail,
  sendEmail,
  type BookingConfirmationInput,
  type RenderedEmail,
} from "@/lib/email/send";
import { PORTAL_ANCHORS, createPortalUrl } from "@/lib/portal-token";
import { getTripLogistics } from "@/lib/trip-logistics";
import { confirmationNumber } from "@/lib/confirmation-number";
import { tierDisplayName } from "@/lib/tier-display";
import { formatAmount, toCents } from "@/lib/balance";
import { formatDateRange } from "@/lib/trips";
import { CONTACT } from "@/lib/site-content";
import { getAppUrl } from "@/lib/site-url";
import { todayInMountain } from "@/lib/mountain-time";

/*
 * -- The two designed post-booking emails ------------------------------------
 *
 * Email 1, the confirmation: sent once, when a booking's first payment (the
 * deposit, or the whole price) has settled. Called from settleCheckoutPayment
 * in lib/payments.ts, which the Stripe webhook, the page-load sync in
 * lib/stripe-sync.ts and Stripe's own redeliveries all run, often at the same
 * moment; and from the daily sweep in app/api/cron/post-booking-emails for a
 * send that failed.
 *
 * Email 2, the chase: 72 hours after the confirmation, to travelers who have
 * not yet done all three things (flights, roommates, details). Sent only by
 * the daily cron. Travelers who have done all three are never selected, so
 * nothing is written for them and they never get it.
 *
 * ONCE AND ONLY ONCE. Each email is claimed before it is sent, with a
 * conditional write only one caller can win:
 *
 *   update bookings set confirmation_email_sent_at = <now>
 *    where id = <id> and confirmation_email_sent_at is null returning id
 *
 * The winner sends; everyone else finds the column set and stops. If the send
 * throws, the claim is put back to null (only if it is still this caller's
 * timestamp), so the next attempt can send. A process that dies between the
 * claim and the send leaves the column set and no email: that is the one gap,
 * and it errs toward one email too few rather than four too many.
 *
 * FALLBACK. The designed confirmation needs facts that are not all in place
 * yet (lib/trip-logistics.ts is mostly nulls until the owner fills it in, the
 * SMS number and the portal secret are env vars). When anything it needs is
 * missing, the traveler gets the existing plain confirmation from
 * lib/email/send.ts instead, under the same claim, and the log names what was
 * missing. Nobody goes without a confirmation. The chase has no fallback: if
 * it cannot be rendered in full it is skipped and logged, and tried again on
 * the next run.
 *
 * Neither email is ever sent with a placeholder left in it: renderTemplate
 * refuses, and that refusal is what triggers the fallback or the skip.
 */

type Admin = SupabaseClient<Database>;

// A booking in either of these states has paid something and is live.
const CONFIRMED_STATUSES = ["deposit_paid", "paid_in_full"] as const;

const BOOKING_SELECT =
  "id, user_id, trip_id, status, total_amount, group_code, flights_booked, rooming_submitted, details_submitted, confirmation_email_sent_at, chase_email_sent_at, users(email, name), trips(name, destination, start_date, end_date, logistics), tiers(name), payments(status, amount, scheduled_date)";

// The same booking read without the post-booking columns, for a database the
// migration adding them has not reached yet (see sendConfirmationEmailOnce).
const LEGACY_BOOKING_SELECT =
  "id, user_id, trip_id, status, total_amount, group_code, users(email, name), trips(name, destination, start_date, end_date, logistics), tiers(name), payments(status, amount, scheduled_date)";

export type PaymentLite = { status: string; amount: number; scheduled_date: string | null };

export type BookingForEmail = {
  id: string;
  user_id: string;
  trip_id: string;
  status: Database["public"]["Enums"]["booking_status"];
  total_amount: number;
  group_code: string | null;
  flights_booked: boolean;
  rooming_submitted: boolean;
  details_submitted: boolean;
  confirmation_email_sent_at: string | null;
  chase_email_sent_at: string | null;
  users: { email: string; name: string | null } | null;
  trips: {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    logistics: string | null;
  } | null;
  tiers: { name: string } | null;
  payments: PaymentLite[];
};

async function loadBooking(admin: Admin, bookingId: string) {
  const { data, error } = await admin.from("bookings").select(BOOKING_SELECT).eq("id", bookingId).maybeSingle();
  return { booking: data as BookingForEmail | null, error };
}

/* -- money, from what has actually cleared ---------------------------------- */

function money(booking: BookingForEmail) {
  const totalCents = toCents(Number(booking.total_amount));
  const paidCents = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + toCents(Number(p.amount)), 0);
  const remainingCents = Math.max(0, totalCents - paidCents);
  const upcoming = booking.payments
    .filter((p) => p.status === "scheduled" && p.scheduled_date)
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));
  return {
    total: totalCents / 100,
    paid: paidCents / 100,
    remaining: remainingCents / 100,
    next: upcoming[0] ?? null,
    upcoming,
    hasSchedule: booking.payments.some((p) => p.scheduled_date !== null),
  };
}

/* -- dates ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "November 14" or "November 14, 2026" from "2026-11-14", with no timezone drift. */
function longDate(iso: string, withYear: boolean): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const base = `${MONTHS[Number(m) - 1]} ${Number(d)}`;
  return withYear ? `${base}, ${y}` : base;
}

/**
 * "Monday, December 14" from "2026-12-14".
 *
 * The weekday is the point: a traveler booking a flight is looking at a
 * calendar of weekdays, and the day is now the whole instruction (there is no
 * arrival time to hit). Date.UTC, so no timezone can move it a day.
 */
function longDayName(iso: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay()];
  return `${weekday}, ${MONTHS[Number(m) - 1]} ${Number(d)}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/* -- who the email is to ---------------------------------------------------- */

/*
 * The name lives in public.users.name, copied from the signup form's
 * user_metadata.name by the handle_new_user trigger, and only if signup sent
 * one. The bookings page falls back to the auth metadata the same way. Only
 * the first word is used: the templates open "Carter, ..." not "Carter
 * Busby, ...".
 *
 * With no name at all the greeting is "Hi there". The templates open with the
 * name and a comma ("{{first_name}}, your spot on ... is held"), so it reads
 * "Hi there, your spot on ... is held".
 */
const NAMELESS_GREETING = "Hi there";

async function firstNameFor(admin: Admin, booking: BookingForEmail): Promise<string | null> {
  let full = booking.users?.name?.trim() || "";
  if (!full) {
    try {
      const { data } = await admin.auth.admin.getUserById(booking.user_id);
      const meta = data.user?.user_metadata?.name;
      if (typeof meta === "string") full = meta.trim();
    } catch {
      // A name is a nicety. Carry on without one.
    }
  }
  const first = full.split(/\s+/)[0] ?? "";
  // Anything implausible as a first name is not worth printing.
  return first && first.length <= 40 ? first : null;
}

/* -- variables -------------------------------------------------------------- */

export function smsNumbers(): { display: string; raw: string } | null {
  const display = process.env.SMS_NUMBER?.trim();
  const raw = process.env.SMS_NUMBER_RAW?.trim();
  // E.164, or the sms: links in both emails do nothing on a phone.
  if (!display || !raw || !/^\+[1-9]\d{7,14}$/.test(raw)) return null;
  return { display, raw };
}

function postalAddress(): { street: string; cityStateZip: string } | null {
  const lines = CONTACT.postalAddress;
  if (!lines || lines.length < 2 || !lines[0].trim() || !lines[1].trim()) return null;
  return { street: lines[0].trim(), cityStateZip: lines[1].trim() };
}

/*
 * The footer's "Email preferences" link. These emails are transactional: the
 * privacy policy (section "Email, the waitlist and marketing") says booking
 * email cannot be turned off while a booking is live, and says how to leave
 * the marketing list. So the link goes there, to the honest answer, rather
 * than to an unsubscribe page that could not unsubscribe anyone from these.
 * It is a plain public URL, so unlike the portal link it never expires.
 */
function preferencesUrl(): string {
  return `${getAppUrl()}/privacy#email`;
}

/** Whether a missing trip fact renders as a visible stand-in (see placeholder()). */
function placeholdersAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

async function variablesFor(
  admin: Admin,
  booking: BookingForEmail,
): Promise<{ variables: TemplateVariables; portalUrl: string | null; firstName: string | null }> {
  const portalUrl = createPortalUrl(booking.id);
  const firstName = await firstNameFor(admin, booking);
  const variables = buildTemplateVariables(booking, {
    firstName,
    portalUrl,
    sms: smsNumbers(),
    placeholders: placeholdersAllowed(),
  });
  return { variables, portalUrl, firstName };
}

/**
 * Every value either template can ask for, or undefined where it is not
 * known. renderTemplate turns an undefined that the template actually uses
 * into a refusal naming it.
 *
 * Pure: everything that needs the database or a secret (the name, the signed
 * portal link, the texting number) is passed in, so the admin preview page can
 * build the same variables from sample data. `placeholders` is the
 * off-production stand-in rule (see placeholder()); the preview forces it on
 * to show the layout, and off to list what production would still be missing.
 */
export function buildTemplateVariables(
  booking: BookingForEmail,
  opts: {
    firstName: string | null;
    portalUrl: string | null;
    sms: { display: string; raw: string } | null;
    placeholders: boolean;
    today?: string;
  },
): TemplateVariables {
  const { firstName, portalUrl, sms } = opts;
  const placeholder = (label: string) => (opts.placeholders ? `[${label} to be confirmed]` : null);
  const trip = booking.trips;
  const logistics = trip ? getTripLogistics(trip.start_date) : null;
  const m = money(booking);

  let nextAmount: string | undefined;
  let nextDate: string | undefined;
  if (m.remaining <= 0) {
    // Paid in full. The template's sentence is "Next installment of X comes
    // out Y on the card you used." and cannot be changed from here, so these
    // two are worded to keep it true: "Next installment of $0 comes out never
    // (paid in full) on the card you used."
    nextAmount = "$0";
    nextDate = "never (paid in full)";
  } else if (m.next?.scheduled_date) {
    nextAmount = formatAmount(Number(m.next.amount));
    nextDate = longDate(m.next.scheduled_date, true);
  }
  // Otherwise money is owed but nothing is scheduled: leave both unknown and
  // let the fallback say it plainly rather than invent a date.

  const variables: TemplateVariables = {};
  const set = (key: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") variables[key] = String(value);
  };

  set("first_name", firstName ?? NAMELESS_GREETING);
  set("confirmation_number", confirmationNumber(booking.id));
  set("tier_name", booking.tiers ? tierDisplayName(booking.tiers.name) : null);
  set("amount_paid", formatAmount(m.paid));
  set("balance_due", formatAmount(m.remaining));
  set("next_payment_amount", nextAmount);
  set("next_payment_date", nextDate);
  set("total_price", formatAmount(m.total));
  set("portal_url", portalUrl);
  set("rooming_url", portalUrl ? `${portalUrl}#${PORTAL_ANCHORS.rooming}` : null);
  set("traveler_details_url", portalUrl ? `${portalUrl}#${PORTAL_ANCHORS.details}` : null);
  set("preferences_url", preferencesUrl());
  // No texting number yet is expected before launch: the same stand-in as a
  // missing trip fact, so the designed emails can still be tested off
  // production. The raw form sits in an sms: link, which then does nothing.
  set("sms_number", sms?.display ?? placeholder("text number"));
  set("sms_number_raw", sms?.raw ?? placeholder("text-number"));

  if (trip) {
    set("trip_name", trip.name);
    set("trip_dates", formatDateRange(trip.start_date, trip.end_date));
    /*
     * The flight days, straight off the trip row.
     *
     * These used to be an arrival deadline and an earliest departure out of
     * lib/trip-logistics.ts ("land by 2:00 pm"). The owner settled it in
     * September 2026: there is no time to hit, the flight just has to be on
     * the right day, both ways. So the day is the whole instruction, and it
     * comes from start_date and end_date rather than a hand-kept fact, which
     * means it is right for every departure without anyone maintaining it and
     * can never contradict the dates printed elsewhere in the same email.
     */
    set("arrival_day", longDayName(trip.start_date));
    set("departure_day", longDayName(trip.end_date));
    // The unit rides in the value ("1 day", "12 days"), so the template's
    // "is {{days_until_trip}} out" never reads "1 days".
    const days = daysBetween(opts.today ?? todayInMountain(), trip.start_date);
    if (days > 0) set("days_until_trip", `${days} ${days === 1 ? "day" : "days"}`);
  }
  if (logistics) {
    set("trip_capacity", logistics.tripCapacity ?? placeholder("trip capacity"));
    set("property_name", logistics.propertyName ?? placeholder("property name"));
    // No arrival_deadline / departure_earliest any more: see arrival_day above.
    set(
      "rooming_lock_date",
      logistics.roomingLockDate ? longDate(logistics.roomingLockDate, false) : placeholder("rooming lock date")
    );
  }

  return variables;
}

/*
 * The stand-in for a trip fact that lib/trip-logistics.ts does not have yet
 * (the `placeholder` helper inside buildTemplateVariables).
 *
 * Only off production. On the sandbox and locally, a visible "[arrival deadline
 * to be confirmed]" lets the designed emails be tested before the facts are
 * settled. On production it returns null, so the variable is missing and the
 * plain confirmation goes out instead: a traveler never gets a placeholder.
 */

function render(template: string, variables: TemplateVariables, flags?: Record<string, boolean>) {
  const address = postalAddress();
  if (!address) {
    throw new TemplateRenderError("No postal address in lib/site-content.ts CONTACT.postalAddress", [
      "postal_address",
    ]);
  }
  return renderTemplate(template, { variables, flags, postalAddress: address });
}

/* -- plain-text parts ------------------------------------------------------- */

// A short text alternative, for clients that show no HTML and for spam
// filters that expect one. It carries the links that matter, nothing else.

function confirmationText(v: TemplateVariables): string {
  return [
    `${v.first_name}, your spot on ${v.trip_name}, ${v.trip_dates}, is held.`,
    "",
    "Three things we need from you today, all in one place:",
    `1. Book your flights into Montrose (MTJ). Fly in ${v.arrival_day} and home ${v.departure_day}. Any time those days works. Flight guide: https://outrider.travel/flights`,
    `2. Tell us who you're rooming with: ${v.rooming_url}`,
    `3. Fill in your traveler details: ${v.traveler_details_url}`,
    "",
    `Your trip page: ${v.portal_url}`,
    "",
    `Confirmation ${v.confirmation_number}. ${v.tier_name}, ${v.total_price} per person. Paid today ${v.amount_paid}, remaining ${v.balance_due}.`,
    "",
    `Text ${v.sms_number} or email bookings@outrider.travel. A person answers within a day.`,
  ].join("\n");
}

function chaseText(v: TemplateVariables, flags: Record<string, boolean>): string {
  const open: string[] = [];
  if (!flags.flights_booked) open.push("Your flights into Montrose (MTJ). Flight guide: https://outrider.travel/flights");
  if (!flags.rooming_submitted) open.push(`Who you're rooming with: ${v.rooming_url}`);
  if (!flags.details_submitted) open.push(`Your traveler details: ${v.traveler_details_url}`);
  return [
    `${v.first_name}, ${v.trip_name} is ${v.days_until_trip} out and we're holding your spot. Still open on your side:`,
    "",
    ...open.map((line) => `- ${line}`),
    "",
    `Finish it on your trip page: ${v.portal_url}`,
    "",
    `Or text ${v.sms_number}. A person answers within a day.`,
  ].join("\n");
}

/* -- pure renders ----------------------------------------------------------- */

/**
 * The designed confirmation, ready to send. Throws TemplateRenderError when
 * anything it needs is missing, which is what sends the plain one instead.
 */
export function renderConfirmationEmail(
  variables: TemplateVariables,
  paidInFull: boolean,
): RenderedEmail & { html: string; text: string } {
  const html = render(confirmationTemplate, variables, {
    paid_in_full: paidInFull,
    has_balance: !paidInFull,
  });
  return {
    // The template's own subject line (its SUBJECT comment).
    subject: "You're in. Three things to do today.",
    html,
    text: confirmationText(variables),
  };
}

export type ChaseFlags = { flights_booked: boolean; rooming_submitted: boolean; details_submitted: boolean };

/** The 72-hour chase, ready to send. Throws TemplateRenderError like the above. */
export function renderChaseEmail(
  variables: TemplateVariables,
  flags: ChaseFlags,
  firstName: string | null,
): RenderedEmail & { html: string; text: string } {
  const html = render(chaseTemplate, variables, flags);
  return {
    // The template's own subject line, without the name when there is none.
    subject: firstName ? `${firstName}, we're still missing a couple of things` : "We're still missing a couple of things",
    html,
    text: chaseText(variables, flags),
  };
}

/** The plain confirmation for a booking, the fallback for the designed one. */
export function renderPlainConfirmationFor(booking: BookingForEmail, portalUrl: string | null) {
  return renderBookingConfirmationEmail(plainConfirmationInput(booking, money(booking), portalUrl));
}

/* -- email 1 ---------------------------------------------------------------- */

export type ConfirmationOutcome = "designed" | "plain" | "not-due" | "already-sent" | "failed";

/**
 * Sends the booking confirmation if it has not gone yet. Never throws.
 *
 * `afterScheduling` is true only for the caller that moved the booking out of
 * pending and has finished writing its installment schedule. Anyone else (a
 * redelivery, the sync, the cron sweep) waits until that schedule is visible,
 * so an email racing the first caller cannot quote a payment plan that has not
 * been written yet. Either way the claim decides who sends.
 */
export async function sendConfirmationEmailOnce(
  admin: Admin,
  bookingId: string,
  { afterScheduling }: { afterScheduling: boolean },
): Promise<ConfirmationOutcome> {
  try {
    const { booking, error } = await loadBooking(admin, bookingId);

    if (error) {
      // Most likely the post-booking migration has not been applied, so the
      // claim column does not exist. The caller that confirmed the booking
      // still sends the plain confirmation, as this code did before: that
      // path was already once-only, guarded by the pending -> paid
      // transition. Everyone else does nothing.
      console.error(`confirmation email: could not read booking ${bookingId}: ${error.message}`);
      if (!afterScheduling) return "failed";
      return await sendLegacyConfirmation(admin, bookingId);
    }

    if (!booking || !booking.users?.email || !booking.trips) return "not-due";
    if (!(CONFIRMED_STATUSES as readonly string[]).includes(booking.status)) return "not-due";
    if (booking.confirmation_email_sent_at) return "already-sent";

    const m = money(booking);
    if (!afterScheduling && booking.status === "deposit_paid" && m.remaining > 0 && !m.hasSchedule) {
      // The confirming caller is still writing the schedule; it sends.
      return "not-due";
    }

    // Worked out before the claim, so a slow render never holds it.
    const { variables, portalUrl } = await variablesFor(admin, booking);
    let designed: ReturnType<typeof renderConfirmationEmail> | null = null;
    let missing: string[] = [];
    try {
      designed = renderConfirmationEmail(variables, booking.status === "paid_in_full");
    } catch (err) {
      if (!(err instanceof TemplateRenderError)) throw err;
      missing = err.missing.length > 0 ? err.missing : [err.message];
    }

    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
      .from("bookings")
      .update({ confirmation_email_sent_at: claimedAt })
      .eq("id", bookingId)
      .is("confirmation_email_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) {
      console.error(`confirmation email: claim failed for booking ${bookingId}: ${claimError.message}`);
      return "failed";
    }
    if (!claimed) return "already-sent";

    try {
      if (designed) {
        await sendEmail({
          from: getFromAddress(),
          replyTo: getFromAddress(),
          to: booking.users.email,
          subject: designed.subject,
          html: designed.html,
          text: designed.text,
        });
        return "designed";
      }

      console.warn(
        `confirmation email: booking ${bookingId} sent the plain confirmation; the designed one is missing: ${missing.join(", ")}`
      );
      await sendPlainConfirmation(booking, m, portalUrl);
      return "plain";
    } catch (err) {
      // Give the claim back, but only if it is still ours, so a later attempt
      // (a redelivery, the sync, tomorrow's sweep) can send.
      await admin
        .from("bookings")
        .update({ confirmation_email_sent_at: null })
        .eq("id", bookingId)
        .eq("confirmation_email_sent_at", claimedAt);
      console.error(
        `confirmation email: send failed for booking ${bookingId}, claim released: ${err instanceof Error ? err.message : err}`
      );
      return "failed";
    }
  } catch (err) {
    console.error(`confirmation email: booking ${bookingId}: ${err instanceof Error ? err.message : err}`);
    return "failed";
  }
}

async function sendPlainConfirmation(
  booking: Pick<BookingForEmail, "id" | "status" | "total_amount" | "group_code" | "users" | "trips" | "tiers">,
  m: ReturnType<typeof money>,
  portalUrl: string | null,
) {
  await sendBookingConfirmationEmail({ to: booking.users!.email, ...plainConfirmationInput(booking, m, portalUrl) });
}

function plainConfirmationInput(
  booking: Pick<BookingForEmail, "id" | "status" | "total_amount" | "group_code" | "users" | "trips" | "tiers">,
  m: ReturnType<typeof money>,
  portalUrl: string | null,
): BookingConfirmationInput {
  return {
    name: booking.users!.name,
    bookingId: booking.id,
    trip: {
      name: booking.trips!.name,
      destination: booking.trips!.destination,
      startDate: booking.trips!.start_date,
      endDate: booking.trips!.end_date,
      logistics: booking.trips!.logistics,
    },
    tierName: booking.tiers ? tierDisplayName(booking.tiers.name) : "Your package",
    totalAmount: m.total,
    amountPaid: m.paid,
    paidInFull: booking.status === "paid_in_full",
    groupCode: booking.group_code,
    upcomingPayments: m.upcoming.map((p) => ({ amount: Number(p.amount), scheduledDate: p.scheduled_date })),
    portalUrl,
  };
}

// Before the migration: the plain email, exactly once, from the confirming
// caller only (see above). Sent without a claim because there is no column
// to claim with.
async function sendLegacyConfirmation(admin: Admin, bookingId: string): Promise<ConfirmationOutcome> {
  const { data, error } = await admin.from("bookings").select(LEGACY_BOOKING_SELECT).eq("id", bookingId).maybeSingle();
  const booking = data as unknown as BookingForEmail | null;
  if (error || !booking || !booking.users?.email || !booking.trips) return "failed";
  try {
    await sendPlainConfirmation(booking, money(booking), createPortalUrl(booking.id));
    return "plain";
  } catch (err) {
    console.error(`confirmation email: legacy send failed for booking ${bookingId}: ${err instanceof Error ? err.message : err}`);
    return "failed";
  }
}

/* -- email 2 ---------------------------------------------------------------- */

export type ChaseOutcome = "sent" | "not-due" | "all-done" | "already-sent" | "skipped" | "failed";

/** Hours after the confirmation before the chase goes. */
export const CHASE_AFTER_HOURS = 72;

/**
 * Sends the 72-hour chase if it is due and has not gone. Never throws.
 *
 * Re-reads the booking and re-checks everything the cron's query did, because
 * the traveler may have finished the last task between that query and now.
 */
export async function sendChaseEmailOnce(admin: Admin, bookingId: string): Promise<ChaseOutcome> {
  try {
    const { booking, error } = await loadBooking(admin, bookingId);
    if (error || !booking || !booking.users?.email || !booking.trips) return "not-due";
    if (!(CONFIRMED_STATUSES as readonly string[]).includes(booking.status)) return "not-due";
    if (booking.chase_email_sent_at) return "already-sent";
    if (
      !booking.confirmation_email_sent_at ||
      Date.now() - new Date(booking.confirmation_email_sent_at).getTime() < CHASE_AFTER_HOURS * 3_600_000
    ) {
      return "not-due";
    }

    const flags: ChaseFlags = {
      flights_booked: booking.flights_booked,
      rooming_submitted: booking.rooming_submitted,
      details_submitted: booking.details_submitted,
    };
    // Done already: no chase, ever. Nothing is written, and the cron's query
    // does not select such a booking again.
    if (flags.flights_booked && flags.rooming_submitted && flags.details_submitted) return "all-done";

    // A trip that has started can never render the chase (there is no "days
    // out" left to say). The cron's query no longer selects one; this is the
    // same rule for any other caller.
    if (booking.trips.start_date.slice(0, 10) <= todayInMountain()) return "not-due";

    const { variables, firstName } = await variablesFor(admin, booking);
    let email: ReturnType<typeof renderChaseEmail>;
    try {
      email = renderChaseEmail(variables, flags, firstName);
    } catch (err) {
      if (!(err instanceof TemplateRenderError)) throw err;
      console.warn(
        `chase email: booking ${bookingId} skipped, cannot render: ${err.missing.length > 0 ? err.missing.join(", ") : err.message}`
      );
      return "skipped";
    }

    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
      .from("bookings")
      .update({ chase_email_sent_at: claimedAt })
      .eq("id", bookingId)
      .is("chase_email_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) {
      console.error(`chase email: claim failed for booking ${bookingId}: ${claimError.message}`);
      return "failed";
    }
    if (!claimed) return "already-sent";

    try {
      await sendEmail({
        from: getFromAddress(),
        replyTo: getFromAddress(),
        to: booking.users.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return "sent";
    } catch (err) {
      await admin
        .from("bookings")
        .update({ chase_email_sent_at: null })
        .eq("id", bookingId)
        .eq("chase_email_sent_at", claimedAt);
      console.error(
        `chase email: send failed for booking ${bookingId}, claim released: ${err instanceof Error ? err.message : err}`
      );
      return "failed";
    }
  } catch (err) {
    console.error(`chase email: booking ${bookingId}: ${err instanceof Error ? err.message : err}`);
    return "failed";
  }
}
