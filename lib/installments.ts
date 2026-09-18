import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getStripe } from "@/lib/stripe";
import { toCents } from "@/lib/balance";

// Days before trip start_date that each installment is due. Fixed calendar
// dates relative to the trip, not the booking date — a booking made close
// to departure will simply have installments whose dates are already in
// the past, which the cron picks up on its very next run.
export const INSTALLMENT_OFFSETS_DAYS = [60, 30];

// Called once, right after the deposit's payment_intent.succeeded webhook
// flips the booking pending -> deposit_paid (see lib/payments.ts). Splits
// evenly with the last installment absorbing any rounding remainder so the
// installments always sum exactly to the remaining balance.
export async function scheduleInstallments(
  admin: SupabaseClient<Database>,
  booking: { id: string; trip_id: string; total_amount: number; deposit_amount: number }
) {
  const remaining = Math.round((booking.total_amount - booking.deposit_amount) * 100) / 100;
  if (remaining <= 0) return;

  const { data: trip } = await admin
    .from("trips")
    .select("start_date")
    .eq("id", booking.trip_id)
    .single();

  if (!trip) return;

  const n = INSTALLMENT_OFFSETS_DAYS.length;
  const base = Math.floor((remaining / n) * 100) / 100;
  const amounts = Array(n).fill(base);
  amounts[n - 1] = Math.round((remaining - base * (n - 1)) * 100) / 100;

  const rows = INSTALLMENT_OFFSETS_DAYS.map((offsetDays, i) => {
    const date = new Date(trip.start_date);
    date.setUTCDate(date.getUTCDate() - offsetDays);
    return {
      booking_id: booking.id,
      amount: amounts[i],
      status: "scheduled" as const,
      scheduled_date: date.toISOString().slice(0, 10),
    };
  });

  await admin.from("payments").insert(rows);
}

/*
 * -- Applying an early payment to the schedule ---------------------------------
 *
 * A traveler can pay down their balance from the bookings page at any time
 * (startBalancePayment in bookings/actions.ts). Once Stripe confirms that
 * payment, the installments still due have to shrink by the same amount, or
 * the cron would go on to collect the full original schedule on top of it.
 *
 * reconcileInstallments does that, and it is written as "make the schedule
 * match what is owed" rather than "subtract this payment". Given the booking
 * total, what has cleared, and what is already on its way through Stripe, the
 * open installments should add up to exactly the difference; anything above
 * that comes off the earliest ones first, cancelling those it covers and
 * reducing the one it only partly covers. Because it works from the current
 * state and not from the event that triggered it, running it twice is the
 * same as running it once, which is what makes Stripe's redelivered webhooks
 * harmless. It runs after every balance payment and every installment
 * outcome, and the cron runs it before it charges anything.
 *
 * It never raises an installment. If the schedule comes up short of what is
 * owed (an admin cancelled a row by hand, say) the gap stays for a person to
 * sort out, rather than the code inventing a charge nobody agreed to.
 */

// How long after the cron stamps an installment's last_attempted_at the row is
// treated as mid-charge and left alone. The cron claims a row by writing that
// timestamp before it creates the PaymentIntent (see
// app/api/cron/charge-installments), so inside this window a charge for the
// full amount may already be on its way to the card, and reducing the row
// would record less than was taken. A charge takes seconds; fifteen minutes is
// slack for a slow run, and anything held back here is picked up by the
// cron's own reconcile before its next attempt.
export const INSTALLMENT_LOCK_MINUTES = 15;

// Rows that still stand for money owed. `failed` is an installment the cron
// gave up on and an admin is chasing: it is still owed, so an early payment
// covers it as well as any other.
const OPEN_STATUSES: readonly string[] = ["scheduled", "requires_action", "failed"];

type ScheduleRow = {
  id: string;
  status: Database["public"]["Enums"]["payment_status"];
  amount: number;
  scheduled_date: string | null;
  stripe_payment_intent_id: string | null;
  last_attempted_at: string | null;
};

export async function reconcileInstallments(admin: SupabaseClient<Database>, bookingId: string) {
  // Every write below is conditional on the row being exactly as it was read.
  // A miss means the cron or another webhook moved it first, so the picture
  // is read again and worked out from scratch. Each miss means somebody else
  // made progress, so three passes is plenty.
  for (let pass = 0; pass < 3; pass++) {
    if ((await reconcileOnce(admin, bookingId)) === "done") return;
  }
  console.error(`reconcileInstallments: booking ${bookingId} kept changing underneath; left for the next run`);
}

async function reconcileOnce(admin: SupabaseClient<Database>, bookingId: string): Promise<"done" | "conflict"> {
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, status, total_amount, payments(id, status, amount, scheduled_date, stripe_payment_intent_id, last_attempted_at)"
    )
    .eq("id", bookingId)
    .single();

  // Only a deposit_paid booking has a schedule to adjust. A cancelled one
  // should not be collecting anything, and money that arrives on it anyway is
  // for a person to refund (the balance webhook logs it).
  if (!booking || booking.status !== "deposit_paid") return "done";

  const total = toCents(booking.total_amount);
  const paid = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + toCents(p.amount), 0);

  const open: ScheduleRow[] = booking.payments.filter(
    (p) => OPEN_STATUSES.includes(p.status) && p.scheduled_date !== null
  );

  let committed = 0;
  const adjustable: ScheduleRow[] = [];
  for (const row of open) {
    if (await isInFlight(row)) committed += toCents(row.amount);
    else adjustable.push(row);
  }

  const target = Math.max(0, total - paid - committed);
  let excess = adjustable.reduce((sum, row) => sum + toCents(row.amount), 0) - target;

  adjustable.sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  for (const row of adjustable) {
    if (excess <= 0) break;

    const cents = toCents(row.amount);
    const covered = cents <= excess;
    const leftOnRow = covered ? 0 : cents - excess;
    excess = covered ? excess - cents : 0;

    // A 3DS installment has a live PaymentIntent the traveler can still
    // confirm from the email link. Cancel it at Stripe first, so the link
    // stops working before the row stops asking for it. If Stripe says it
    // already went through, the traveler got there first: start over and it
    // counts as paid.
    if (row.status === "requires_action" && row.stripe_payment_intent_id) {
      if (!(await cancelIntent(row.stripe_payment_intent_id))) return "conflict";
    }

    let patch: Database["public"]["Tables"]["payments"]["Update"];
    if (covered) {
      patch = { status: "canceled" };
    } else if (row.status === "requires_action") {
      // The cancelled intent cannot be reused, so the reduced amount goes back
      // in the queue as an ordinary installment and the cron makes a fresh
      // attempt at it.
      patch = { amount: leftOnRow / 100, status: "scheduled", stripe_payment_intent_id: null };
    } else {
      patch = { amount: leftOnRow / 100 };
    }

    let update = admin
      .from("payments")
      .update(patch)
      .eq("id", row.id)
      .eq("status", row.status)
      .eq("amount", row.amount);
    update = row.last_attempted_at
      ? update.eq("last_attempted_at", row.last_attempted_at)
      : update.is("last_attempted_at", null);

    const { data: written, error } = await update.select("id");
    if (error) {
      console.error(`reconcileInstallments: could not update payment ${row.id}: ${error.message}`);
      return "conflict";
    }
    if (!written || written.length === 0) return "conflict";
  }

  if (total - paid <= 0) {
    await admin.from("bookings").update({ status: "paid_in_full" }).eq("id", bookingId).eq("status", "deposit_paid");
  }
  if (total - paid < 0) {
    // Only reachable if two charges crossed despite the guards (a 3DS
    // confirmation landing in the same second as a balance payment, say).
    // Refunds are handled by hand, so the job here is to be loud about it.
    console.error(
      `reconcileInstallments: booking ${bookingId} is overpaid by $${((paid - total) / 100).toFixed(2)}. Refund by hand.`
    );
  }

  return "done";
}

/**
 * Whether an open installment may already be turning into money, in which case
 * its amount is counted as paid and the row is not touched.
 *
 * Two ways that happens: the cron claimed it moments ago and may be mid-charge,
 * or its PaymentIntent has succeeded (or is processing) and the webhook saying
 * so has not landed yet. If Stripe cannot be reached the answer is yes. The
 * cost of a wrong yes is an adjustment made on the next run; the cost of a
 * wrong no is charging someone twice.
 */
async function isInFlight(row: ScheduleRow): Promise<boolean> {
  if (row.status === "scheduled" && row.last_attempted_at) {
    const age = Date.now() - new Date(row.last_attempted_at).getTime();
    if (age < INSTALLMENT_LOCK_MINUTES * 60 * 1000) return true;
  }

  if (!row.stripe_payment_intent_id) return false;

  try {
    const intent = await getStripe().paymentIntents.retrieve(row.stripe_payment_intent_id);
    return intent.status === "succeeded" || intent.status === "processing";
  } catch (err) {
    console.error(
      `reconcileInstallments: could not read ${row.stripe_payment_intent_id}: ${err instanceof Error ? err.message : err}`
    );
    return true;
  }
}

/** True once the intent can no longer take money: cancelled now, or already. */
async function cancelIntent(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === "canceled") return true;
    if (intent.status === "succeeded" || intent.status === "processing") return false;
    await stripe.paymentIntents.cancel(paymentIntentId);
    return true;
  } catch (err) {
    console.error(`reconcileInstallments: could not cancel ${paymentIntentId}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/**
 * Whether any open installment on the booking is mid-charge (see isInFlight).
 * startBalancePayment refuses to start while one is, because the balance it
 * would offer to take is about to be out of date.
 */
export async function installmentInFlight(admin: SupabaseClient<Database>, bookingId: string): Promise<boolean> {
  const { data: rows } = await admin
    .from("payments")
    .select("id, status, amount, scheduled_date, stripe_payment_intent_id, last_attempted_at")
    .eq("booking_id", bookingId)
    .in("status", ["scheduled", "requires_action", "failed"])
    .not("scheduled_date", "is", null);

  for (const row of rows ?? []) {
    if (await isInFlight(row)) return true;
  }
  return false;
}

// How long an early payment the traveler started but has not finished holds
// off the cron. See balancePaymentOpen.
export const BALANCE_PAYMENT_HOLD_HOURS = 24;

/**
 * Whether an early payment from the bookings page could still take money on
 * this booking. Balance rows are the `pending` payments with no
 * scheduled_date on a booking whose deposit has cleared.
 *
 * The danger is two charges against one balance. A traveler opens the card
 * form for "the remaining balance", the cron charges an installment, and then
 * the traveler pays: both succeed, and the balance is paid twice. So the cron
 * does not charge a booking while one of these is open. An open one older than
 * `cancelOpenOlderThanMs` is cancelled at Stripe instead (its card form stops
 * working) and stops counting; the cron passes BALANCE_PAYMENT_HOLD_HOURS, so
 * a form left open delays an installment by a day at most, and
 * startBalancePayment passes zero, because a new attempt replaces any earlier
 * one.
 *
 * Processing or succeeded (the webhook has not landed) always counts: that
 * money is moving and cannot be called back. So does anything Stripe will not
 * read or cancel, on the same principle as isInFlight: a wrong yes costs a
 * day, a wrong no costs the traveler.
 */
export async function balancePaymentOpen(
  admin: SupabaseClient<Database>,
  bookingId: string,
  { cancelOpenOlderThanMs }: { cancelOpenOlderThanMs: number },
): Promise<boolean> {
  const { data: pending } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .is("scheduled_date", null);

  const stripe = getStripe();
  for (const row of pending ?? []) {
    if (!row.stripe_payment_intent_id) continue;
    try {
      const intent = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
      if (intent.status === "succeeded" || intent.status === "processing") return true;

      if (intent.status !== "canceled") {
        const age = Date.now() - intent.created * 1000;
        if (age < cancelOpenOlderThanMs) return true;
        await stripe.paymentIntents.cancel(intent.id);
      }
    } catch {
      return true;
    }
    await admin.from("payments").update({ status: "canceled" }).eq("id", row.id).eq("status", "pending");
  }
  return false;
}
