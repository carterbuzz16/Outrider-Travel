import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { formatDate, renderEmailLayout } from "@/lib/email/layout";
import { getFromAddress, sendEmail, type RenderedEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";
import { todayInMountain } from "@/lib/mountain-time";
import { createPortalUrl } from "@/lib/portal-token";
import { tierDisplayName } from "@/lib/tier-display";
import {
  PENTHOUSE_DISCLAIMER,
  claimFromRows,
  penthouseFill,
  penthouseInvitePath,
  type ClaimRow,
  type PenthouseFill,
} from "@/lib/penthouse";

/**
 * The two penthouse emails, sent to every member of the group holding one:
 *
 *   full      "Penthouse 702 is full. All eight of you are in." Sent from the
 *             payment-settled path (lib/payments.ts) the moment the last place
 *             is paid for, with the daily cron as a backstop.
 *   reminder  "Two days left to fill Penthouse 702." Sent by the daily cron
 *             once the 7-day fill deadline is within 48 hours and places are
 *             still open.
 *
 * Each is once per recipient booking. Before sending, the booking is claimed
 * with a conditional update on its *_email_sent_at column (set only where it is
 * still null, returning the row), so the webhook, the Stripe sync and the cron
 * racing each other cannot double-send; a failed send puts the column back.
 * Nothing here touches a booking's status or money.
 *
 * Plain layout (renderEmailLayout), the same from and reply-to as the other
 * booking mail. The owner's HTML templates are not used or changed.
 */

type Admin = SupabaseClient<Database>;
type Column = "penthouse_full_email_sent_at" | "penthouse_reminder_email_sent_at";

export type PenthouseEmailOutcome = { sent: number; skipped: number; failed: number };

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

const MEMBER_COLUMNS =
  "id, status, group_code, created_at, penthouse_full_email_sent_at, penthouse_reminder_email_sent_at, users(email, name), payments(paid_at, scheduled_date)";

export type PenthouseTierContext = {
  id: string;
  name: string;
  max_capacity: number | null;
  trip_id: string;
  trips: { name: string; start_date: string; end_date: string } | null;
};

type MemberRow = ClaimRow & {
  penthouse_full_email_sent_at: string | null;
  penthouse_reminder_email_sent_at: string | null;
  users: { email: string; name: string | null } | null;
};

/**
 * Called from the payment-settled path for the booking that just settled.
 * Does nothing unless that booking is in a penthouse its group has now filled.
 */
export async function sendPenthouseFullEmailsFor(admin: Admin, bookingId: string): Promise<PenthouseEmailOutcome> {
  const none = { sent: 0, skipped: 0, failed: 0 };
  const { data: booking } = await admin
    .from("bookings")
    .select("tier_id, group_code, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking?.group_code || (booking.status !== "deposit_paid" && booking.status !== "paid_in_full")) return none;

  const tier = await loadTier(admin, booking.tier_id);
  if (!tier) return none;
  const rows = await loadRows(admin, tier.id);
  if (!rows || tier.max_capacity === null) return none;

  const fill = penthouseFill(rows, booking.group_code, tier.max_capacity);
  if (fill.state !== "full") return none;
  return sendToMembers(admin, tier, rows, booking.group_code, fill, "penthouse_full_email_sent_at");
}

/**
 * The daily cron's step: for every held penthouse on an upcoming trip, the
 * "full" email as a backstop, and the 48-hour reminder where it is due.
 */
export async function sendDuePenthouseEmails(
  admin: Admin,
  now: Date = new Date(),
): Promise<{ full: PenthouseEmailOutcome; reminder: PenthouseEmailOutcome }> {
  const full = { sent: 0, skipped: 0, failed: 0 };
  const reminder = { sent: 0, skipped: 0, failed: 0 };
  // Mountain Time, where the trips are (lib/mountain-time.ts), not UTC.
  const today = todayInMountain(now);

  const { data: tiers, error } = await admin
    .from("tiers")
    .select("id, name, max_capacity, trip_id, trips!inner(name, start_date, end_date)")
    .eq("group_exclusive", true)
    .gte("trips.start_date", today);
  if (error) {
    console.error(`penthouse emails: tier query failed: ${error.message}`);
    return { full, reminder };
  }

  for (const tier of (tiers ?? []) as PenthouseTierContext[]) {
    if (tier.max_capacity === null) continue;
    const rows = await loadRows(admin, tier.id);
    if (!rows) continue;
    const claim = claimFromRows(rows, now);
    if (!claim?.code) continue;

    const fill = penthouseFill(rows, claim.code, tier.max_capacity, now);
    if (fill.state === "full") {
      add(full, await sendToMembers(admin, tier, rows, claim.code, fill, "penthouse_full_email_sent_at"));
    } else if (
      fill.state === "filling" &&
      fill.deadline &&
      fill.deadline.getTime() - now.getTime() <= REMINDER_WINDOW_MS
    ) {
      add(reminder, await sendToMembers(admin, tier, rows, claim.code, fill, "penthouse_reminder_email_sent_at"));
    }
  }
  return { full, reminder };
}

/* -- internals -------------------------------------------------------------- */

function add(into: PenthouseEmailOutcome, from: PenthouseEmailOutcome) {
  into.sent += from.sent;
  into.skipped += from.skipped;
  into.failed += from.failed;
}

async function loadTier(admin: Admin, tierId: string): Promise<PenthouseTierContext | null> {
  const { data } = await admin
    .from("tiers")
    .select("id, name, max_capacity, trip_id, group_exclusive, trips(name, start_date, end_date)")
    .eq("id", tierId)
    .maybeSingle();
  return data?.group_exclusive ? data : null;
}

async function loadRows(admin: Admin, tierId: string): Promise<MemberRow[] | null> {
  const { data, error } = await admin
    .from("bookings")
    .select(MEMBER_COLUMNS)
    .eq("tier_id", tierId)
    .neq("status", "cancelled");
  if (error) {
    console.error(`penthouse emails: bookings for tier ${tierId} failed: ${error.message}`);
    return null;
  }
  return data as MemberRow[];
}

async function sendToMembers(
  admin: Admin,
  tier: PenthouseTierContext,
  rows: MemberRow[],
  code: string,
  fill: PenthouseFill,
  column: Column,
): Promise<PenthouseEmailOutcome> {
  const outcome = { sent: 0, skipped: 0, failed: 0 };
  const members = rows.filter(
    (r) => r.group_code === code && (r.status === "deposit_paid" || r.status === "paid_in_full") && r[column] === null,
  );

  for (const member of members) {
    if (!member.users?.email) {
      outcome.skipped++;
      continue;
    }

    // The claim: only the caller whose update flips null to a timestamp sends.
    const claimedAt = new Date().toISOString();
    const { data: claimed } = await admin
      .from("bookings")
      .update(columnValue(column, claimedAt))
      .eq("id", member.id)
      .is(column, null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      outcome.skipped++;
      continue;
    }

    try {
      if (column === "penthouse_full_email_sent_at") {
        await sendFull(member, tier, fill);
      } else {
        await sendReminder(member, tier, code, fill);
      }
      outcome.sent++;
    } catch (err) {
      console.error(
        `penthouse email (${column}) to booking ${member.id} failed: ${err instanceof Error ? err.message : err}`,
      );
      // Released so the next run tries again, but only if the claim is still
      // ours: another caller may have claimed (and sent) since.
      await admin.from("bookings").update(columnValue(column, null)).eq("id", member.id).eq(column, claimedAt);
      outcome.failed++;
    }
  }
  return outcome;
}

/** One of the two claim columns as an update payload, typed for supabase-js. */
function columnValue(column: Column, value: string | null): Database["public"]["Tables"]["bookings"]["Update"] {
  return column === "penthouse_full_email_sent_at"
    ? { penthouse_full_email_sent_at: value }
    : { penthouse_reminder_email_sent_at: value };
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
function inWords(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dates(tier: Pick<PenthouseTierContext, "trips">): string {
  const trip = tier.trips;
  return trip ? `${formatDate(trip.start_date)} to ${formatDate(trip.end_date)}` : "";
}

async function sendFull(member: MemberRow, tier: PenthouseTierContext, fill: PenthouseFill) {
  const portalUrl = createPortalUrl(member.id) ?? `${getAppUrl()}/bookings`;
  const { subject, html, text } = renderPenthouseFullEmail({ memberName: member.users?.name ?? null, tier, fill, portalUrl });
  await sendEmail({
    from: getFromAddress(),
    replyTo: getFromAddress(),
    to: member.users!.email,
    subject,
    html,
    text,
  });
}

/** "Penthouse 702 is full", for one member. Pure: the caller supplies the portal link. */
export function renderPenthouseFullEmail(opts: {
  memberName: string | null;
  tier: Pick<PenthouseTierContext, "name" | "trips">;
  fill: Pick<PenthouseFill, "capacity">;
  portalUrl: string;
}): RenderedEmail & { html: string; text: string } {
  const { memberName, tier, fill, portalUrl } = opts;
  const name = tierDisplayName(tier.name);
  const tripName = tier.trips?.name ?? "your trip";
  const greeting = memberName ? `Hi ${escapeHtml(memberName)},` : "Hi there,";
  const subject = `${name} is full. All ${inWords(fill.capacity)} of you are in.`;

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Every place in <strong>${escapeHtml(name)}</strong> is booked. The penthouse is yours for <strong>${escapeHtml(tripName)}</strong>, ${escapeHtml(dates(tier))}.</p>
    <p>Next, three short things on your trip page: your flights, your roommate request for the bedrooms, and your traveler details. About five minutes, and it helps us have everything ready before you land.</p>
    <p>Reply to this email if anything comes up. A person reads it.</p>
  `;

  return {
    subject,
    html: renderEmailLayout({
      preheader: `All ${fill.capacity} places in ${name} are booked.`,
      bodyHtml,
      ctaLabel: "Open your trip page",
      ctaUrl: portalUrl,
    }),
    text: [
      memberName ? `Hi ${memberName},` : "Hi there,",
      "",
      `Every place in ${name} is booked. The penthouse is yours for ${tripName}, ${dates(tier)}.`,
      "",
      "Next, three short things on your trip page: your flights, your roommate request and your traveler details.",
      portalUrl,
      "",
      "Reply to this email if anything comes up. A person reads it.",
    ].join("\n"),
  };
}

async function sendReminder(member: MemberRow, tier: PenthouseTierContext, code: string, fill: PenthouseFill) {
  const { subject, html, text } = renderPenthouseReminderEmail({ memberName: member.users?.name ?? null, tier, code, fill });
  await sendEmail({
    from: getFromAddress(),
    replyTo: getFromAddress(),
    to: member.users!.email,
    subject,
    html,
    text,
  });
}

/** "Two days left to fill Penthouse 702", for one member. Pure. */
export function renderPenthouseReminderEmail(opts: {
  memberName: string | null;
  tier: Pick<PenthouseTierContext, "id" | "name" | "trip_id">;
  code: string;
  fill: Pick<PenthouseFill, "capacity" | "filled">;
}): RenderedEmail & { html: string; text: string } {
  const { memberName, tier, code, fill } = opts;
  const name = tierDisplayName(tier.name);
  const open = Math.max(0, fill.capacity - fill.filled);
  const places = `${open} ${open === 1 ? "place" : "places"} open`;
  const shareUrl = `${getAppUrl()}${penthouseInvitePath(tier.trip_id, tier.id, code)}`;
  const greeting = memberName ? `Hi ${escapeHtml(memberName)},` : "Hi there,";
  const subject = `Two days left to fill ${name}. ${fill.filled} of ${fill.capacity} in, ${places}.`;

  const bodyHtml = `
    <p>${greeting}</p>
    <p><strong>${escapeHtml(name)}</strong> has ${fill.filled} of ${fill.capacity} places booked, and about two days left to fill the rest.</p>
    <p>If friends are still deciding, send them this link. It opens the penthouse with your group code <strong style="letter-spacing: 2px;">${escapeHtml(code)}</strong> already filled in:</p>
    <p><a href="${shareUrl}">${escapeHtml(shareUrl)}</a></p>
    <p style="font-size: 13px; color: #6B635C;">${escapeHtml(PENTHOUSE_DISCLAIMER)}</p>
  `;

  return {
    subject,
    html: renderEmailLayout({
      preheader: `${fill.filled} of ${fill.capacity} in, ${places}.`,
      bodyHtml,
      ctaLabel: "Share the penthouse link",
      ctaUrl: shareUrl,
    }),
    text: [
      memberName ? `Hi ${memberName},` : "Hi there,",
      "",
      `${name} has ${fill.filled} of ${fill.capacity} places booked, and about two days left to fill the rest.`,
      "",
      `Send friends this link. It opens the penthouse with your group code ${code} filled in:`,
      shareUrl,
      "",
      PENTHOUSE_DISCLAIMER,
    ].join("\n"),
  };
}
