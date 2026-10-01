import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { discountCodeAmount } from "@/lib/discount-codes";
import { earlyAccessFromPrice } from "@/lib/early-access";
import { sendCodeOfferEmail } from "@/lib/email/send";
import { offerDaysLeft } from "@/lib/code-offer";
import type { CodeOfferKind } from "@/lib/email/templates/code-offer";

/*
 * Daily, from Vercel Cron (vercel.json): the two reminders for a $100 code
 * asked for on /telluride (lib/code-offer.ts).
 *
 *   "reminder"  two days before the code's last day (or one, if a run was
 *               missed), Mountain Time calendar days;
 *   "last-day"  on the last day itself. The run is in the morning there, and
 *               the code works until 11:59 PM.
 *
 * The sheet says these will come ("remind you before it runs out"), so they go
 * whatever the list box said. They do not go to someone who unsubscribed, to a
 * code that has been used, switched off or has run out (discount_code_amount
 * answers all three), or to an address with a paid booking: they have booked,
 * with this code or without it.
 *
 * Each send claims its row first (stamping the column only where it is still
 * empty), so two runs overlapping send each email once; a send that fails
 * gives the claim back for the next run.
 *
 * Its own route, like post-booking-emails, so email trouble here can never
 * hold up the run that takes money.
 */

// Same constant-time comparison as charge-installments; see the note there.
function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// A burst of offer mail from a young sending domain is what lands it in spam,
// so a backlog goes out over a few runs. Far above a normal day. Soonest to
// run out goes first, because a "last day" held over to the next run is never
// sent: by then the code has expired.
const MAX_SENDS_PER_RUN = 150;
// The most Supabase returns in one read. Far above three normal days of codes.
const CANDIDATES_PER_RUN = 1000;
/** Codes running out within this many days are looked at; nothing earlier needs a reminder yet. */
const LOOKAHEAD_DAYS = 3;

type Candidate = {
  id: string;
  email: string;
  unsubscribe_token: string;
  offer_code: string;
  offer_reminder_sent_at: string | null;
  offer_last_day_sent_at: string | null;
  discount_codes: { expires_at: string | null } | null;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not set. Refusing to run the code offer reminders.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!timingSafeStringEqual(request.headers.get("authorization") ?? "", `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const [candidates, paid] = await Promise.all([
    admin
      .from("waitlist_signups")
      .select(
        "id, email, unsubscribe_token, offer_code, offer_reminder_sent_at, offer_last_day_sent_at, discount_codes!inner(expires_at)",
      )
      .not("offer_code", "is", null)
      .is("unsubscribed_at", null)
      .or("offer_reminder_sent_at.is.null,offer_last_day_sent_at.is.null")
      .gt("discount_codes.expires_at", now.toISOString())
      .lte("discount_codes.expires_at", new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000).toISOString())
      .limit(CANDIDATES_PER_RUN),
    admin.from("bookings").select("users(email)").in("status", ["deposit_paid", "paid_in_full"]),
  ]);

  // Fails closed: without knowing who has booked, nobody is mailed.
  if (candidates.error || paid.error) {
    const err = candidates.error ?? paid.error;
    console.error(`code-offer-reminders: read failed: ${err?.code} ${err?.message}`);
    return NextResponse.json({ error: "Read failed" }, { status: 500 });
  }

  const booked = new Set(
    ((paid.data ?? []) as { users: { email: string } | null }[])
      .map((row) => row.users?.email?.toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

  const fromPrice = await earlyAccessFromPrice();
  const tally = { reminder: 0, "last-day": 0, skipped: 0, failed: 0 };
  let sent = 0;

  const due = ((candidates.data ?? []) as unknown as Candidate[]).sort(
    (a, b) => Date.parse(a.discount_codes?.expires_at ?? "") - Date.parse(b.discount_codes?.expires_at ?? ""),
  );

  for (const row of due) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    const expiresAt = row.discount_codes?.expires_at;
    if (!expiresAt) continue;

    const daysLeft = offerDaysLeft(expiresAt, now);
    const kind: CodeOfferKind | null =
      daysLeft === 0 && !row.offer_last_day_sent_at
        ? "last-day"
        : (daysLeft === 1 || daysLeft === 2) && !row.offer_reminder_sent_at
          ? "reminder"
          : null;
    if (!kind) continue;

    if (booked.has(row.email.toLowerCase()) || (await discountCodeAmount(admin, row.offer_code)) === null) {
      tally.skipped++;
      continue;
    }

    const column = kind === "last-day" ? "offer_last_day_sent_at" : "offer_reminder_sent_at";
    const stamp = (at: string | null) =>
      kind === "last-day" ? { offer_last_day_sent_at: at } : { offer_reminder_sent_at: at };
    const claim = await admin
      .from("waitlist_signups")
      .update(stamp(now.toISOString()))
      .eq("id", row.id)
      .is(column, null)
      .is("unsubscribed_at", null)
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data) continue;

    try {
      await sendCodeOfferEmail(row.email, {
        kind,
        code: row.offer_code,
        expiresAt,
        unsubscribeToken: row.unsubscribe_token,
        fromPrice,
        now,
      });
      tally[kind]++;
      sent++;
    } catch (err) {
      tally.failed++;
      console.error(`code-offer-reminders: ${kind} to row ${row.id} failed, released for the next run:`, err);
      await admin.from("waitlist_signups").update(stamp(null)).eq("id", row.id);
    }
  }

  return NextResponse.json({ ok: true, ...tally });
}
