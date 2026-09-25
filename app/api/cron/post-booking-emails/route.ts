import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHASE_AFTER_HOURS, sendChaseEmailOnce, sendConfirmationEmailOnce } from "@/lib/email/post-booking";
import { sendDuePenthouseEmails } from "@/lib/email/penthouse";
import { todayInMountain } from "@/lib/mountain-time";
import { sweepUnpaidTravelerDetails } from "@/lib/stale-checkout";

/*
 * Daily, from Vercel Cron (vercel.json). The plan runs crons once a day, so
 * "72 hours after checkout" means "on the first run after 72 hours", which is
 * at most a day late.
 *
 * Its own route rather than a step in charge-installments, so a problem with
 * email can never hold up or fail the run that takes money, and the reverse.
 *
 * Two jobs, both capped per run so a backlog (say, the day the trip logistics
 * are filled in and every waiting booking becomes sendable) goes out over a
 * few days instead of in one burst from a young sending domain:
 *
 *   1. Confirmations that did not go out. The webhook path sends them; this
 *      catches a send that failed and released its claim. Bookings from the
 *      last few days only, and not the last half hour, which is still the
 *      webhook's to deal with.
 *   2. The chase, 72 hours after the confirmation, to bookings with anything
 *      still open. A booking with all three things done is not selected at
 *      all, so it never gets one.
 *
 * Each send claims its booking first (lib/email/post-booking.ts), so two runs
 * overlapping, or this racing the webhook, still sends each email once.
 */

// Same constant-time comparison as charge-installments; see the note there.
function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

const CONFIRMATION_SWEEP_DAYS = 3;
const CONFIRMATION_SWEEP_MIN_AGE_MINUTES = 30;
const MAX_CONFIRMATIONS_PER_RUN = 20;

// Candidates read per run, and chases actually sent. More are read than sent
// because some are skipped (a template value missing for that trip) and those
// must not crowd out the ones that can go.
const CHASE_CANDIDATES_PER_RUN = 200;
const MAX_CHASES_PER_RUN = 25;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not set. Refusing to run the post-booking emails.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!timingSafeStringEqual(request.headers.get("authorization") ?? "", `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  // -- 1. confirmations -------------------------------------------------------
  const { data: unconfirmed, error: unconfirmedError } = await admin
    .from("bookings")
    .select("id")
    .in("status", ["deposit_paid", "paid_in_full"])
    .is("confirmation_email_sent_at", null)
    .gte("created_at", new Date(now - CONFIRMATION_SWEEP_DAYS * 86_400_000).toISOString())
    .lte("created_at", new Date(now - CONFIRMATION_SWEEP_MIN_AGE_MINUTES * 60_000).toISOString())
    .order("created_at")
    .limit(MAX_CONFIRMATIONS_PER_RUN);

  if (unconfirmedError) {
    console.error(`post-booking-emails: confirmation query failed: ${unconfirmedError.message}`);
  }

  const confirmations: Record<string, number> = {};
  for (const { id } of unconfirmed ?? []) {
    const outcome = await sendConfirmationEmailOnce(admin, id, { afterScheduling: false });
    confirmations[outcome] = (confirmations[outcome] ?? 0) + 1;
  }

  // -- 2. chases --------------------------------------------------------------
  // Only trips that have not started (Mountain Time, where they are). A
  // chase for a trip under way can never render, and left in the query those
  // bookings would sit at the front of the queue for good, crowding out the
  // ones that can go. Filtering them out is permanent in effect: a trip's
  // start date only gets further behind, and nothing is written, so a send
  // stays claimable exactly once as before.
  const { data: candidates, error: chaseError } = await admin
    .from("bookings")
    .select("id, trips!inner(start_date)")
    .gt("trips.start_date", todayInMountain(new Date(now)))
    .in("status", ["deposit_paid", "paid_in_full"])
    .is("chase_email_sent_at", null)
    .lte("confirmation_email_sent_at", new Date(now - CHASE_AFTER_HOURS * 3_600_000).toISOString())
    .or("flights_booked.eq.false,rooming_submitted.eq.false,details_submitted.eq.false")
    .order("confirmation_email_sent_at")
    .limit(CHASE_CANDIDATES_PER_RUN);

  if (chaseError) {
    console.error(`post-booking-emails: chase query failed: ${chaseError.message}`);
  }

  const chases: Record<string, number> = {};
  let sent = 0;
  for (const { id } of candidates ?? []) {
    if (sent >= MAX_CHASES_PER_RUN) break;
    const outcome = await sendChaseEmailOnce(admin, id);
    chases[outcome] = (chases[outcome] ?? 0) + 1;
    if (outcome === "sent") sent++;
  }

  // -- 3. penthouses ----------------------------------------------------------
  // "Full" as a backstop for a send the payment path missed, and the reminder
  // once a group's 7-day fill deadline is under 48 hours away. Each claimed per
  // recipient booking; see lib/email/penthouse.ts.
  let penthouses: Awaited<ReturnType<typeof sendDuePenthouseEmails>> | { error: string };
  try {
    penthouses = await sendDuePenthouseEmails(admin, new Date(now));
  } catch (err) {
    console.error(`post-booking-emails: penthouse step failed: ${err instanceof Error ? err.message : err}`);
    penthouses = { error: "failed" };
  }

  // -- 4. details on unpaid checkouts ----------------------------------------
  // Not an email, but the one daily job there is. Checkout asks for a name
  // and date of birth before the card, and a checkout walked away from is
  // otherwise never touched again; see sweepUnpaidTravelerDetails.
  const unpaidDetailsDropped = await sweepUnpaidTravelerDetails(admin, now);

  return NextResponse.json({ confirmations, chases, penthouses, unpaidDetailsDropped });
}
