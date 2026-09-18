import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getStripe } from "@/lib/stripe";
import { toCents } from "@/lib/balance";
import { sendOverpaymentRefundEmail } from "@/lib/email/send";

/*
 * -- The overpayment safety net ------------------------------------------------
 *
 * Everything upstream of this file tries to stop a booking being paid twice:
 * one open early payment per booking, the cron holding off while one is open,
 * idempotency keys on every PaymentIntent. Those guards narrow the races; they
 * cannot close all of them, because two card confirmations can still land at
 * Stripe in the same second. This is what happens when one gets through.
 *
 * refundOverpayment runs at the end of every payment_intent.succeeded handler
 * in lib/payments.ts, after the payment has been recorded and the schedule
 * reconciled. If what has cleared on the booking now exceeds its price, the
 * difference goes back to the card that was just charged, capped at what that
 * charge took. The refund is recorded on the payment row itself, because there
 * is nowhere else to put it without a schema change: a partial refund reduces
 * the row's amount to what Outrider kept, and a full one moves it to the
 * `refunded` status. Every "what has cleared" sum in the app counts only
 * `succeeded` rows at their recorded amount (owedCents in lib/balance.ts,
 * reconcileInstallments, the bookings and confirmation pages), so they all see
 * the right figure without being taught about refunds.
 *
 * Money arriving on a cancelled booking is different. A deposit taken before
 * the cancellation is the traveler's to lose under the cancellation terms, and
 * anything above it is refunded on a sliding scale a person works out, so that
 * is logged for a human. Only a payment provably created after the booking was
 * already cancelled is refunded here, in full. The proof is the booking status
 * each creation path reads just before creating the intent and stamps into its
 * metadata (`bookingStatus`); intents without the stamp are never refunded
 * automatically.
 *
 * Safe to run any number of times for the same intent, including concurrently
 * with itself (the webhook and a page-load sync arriving together) and with
 * the handler for a different payment on the same booking:
 *
 *   - The refund is created with the idempotency key
 *     overpay-refund-<intent>-<cents>, and an intent that already carries one
 *     of these refunds is never refunded again. One automatic refund per
 *     intent, at most. The amount is in the key because Stripe refuses a key
 *     reused with different parameters: if a first attempt failed and the
 *     booking's figures moved before the redelivery, the retry has to be able
 *     to refund the new figure rather than fail on the old key for 24 hours.
 *   - The row is reduced before the refund is created, by a write conditional
 *     on the row being exactly as read. Only one caller wins that write, and
 *     only the winner refunds and emails.
 *   - Two different payments settling at once could each see the booking over
 *     by the same amount and each refund it. So after reducing its own row, a
 *     caller re-reads the booking; if it is now under its price, someone else
 *     also took a share, and this caller puts its row back and throws
 *     RefundContentionError. The webhook route answers 500 on a throw, Stripe
 *     redelivers minutes later when nothing else is running, and the retry
 *     finds the true figure. Wrongly backing off costs a retry; wrongly going
 *     ahead costs Outrider the overpayment twice.
 *   - Whenever the booking looks over its price, the row is first reconciled
 *     against Stripe's own list of refunds, and only ever downwards, so a
 *     delivery that died after the refund but before recording it is
 *     finished by the next one rather than refunded again.
 */

export const OVERPAYMENT_REFUND_REASON = "overpayment";

/** Thrown to make Stripe redeliver the webhook after a concurrent refund. */
export class RefundContentionError extends Error {}

type Admin = SupabaseClient<Database>;

export async function refundOverpayment(admin: Admin, bookingId: string, paymentIntent: Stripe.PaymentIntent) {
  if (paymentIntent.status !== "succeeded") return;

  const stripe = getStripe();
  const loadBooking = async () =>
    (
      await admin
        .from("bookings")
        .select("id, status, total_amount, payments(id, status, amount, stripe_payment_intent_id)")
        .eq("id", bookingId)
        .single()
    ).data;

  let booking = await loadBooking();
  if (!booking) return;

  // The usual case, answered from the database alone: a live booking paid no
  // more than its price. No Stripe call on the path every payment takes.
  if (booking.status !== "cancelled" && clearedCents(booking.payments) <= toCents(booking.total_amount)) return;

  // Only the refunds this file made. A refund someone issues by hand from the
  // Stripe dashboard (a cancellation under the terms, say) is theirs to record,
  // and counting it here would move the booking's balance under them.
  const refunds = await stripe.refunds.list({ payment_intent: paymentIntent.id, limit: 100 });
  const alreadyRefunded = refunds.data
    .filter((r) => r.metadata?.reason === OVERPAYMENT_REFUND_REASON && r.status !== "failed" && r.status !== "canceled")
    .reduce((sum, r) => sum + r.amount, 0);

  // A refund made on an earlier delivery that died before recording it. Record
  // it now and look at the booking again: that is usually the whole excess.
  if (alreadyRefunded > 0) {
    await recordRefunded(admin, paymentIntent, alreadyRefunded);
    booking = await loadBooking();
    if (!booking) return;
  }

  const own = booking.payments.find((p) => p.stripe_payment_intent_id === paymentIntent.id);
  if (!own || own.status !== "succeeded") return;

  const total = toCents(booking.total_amount);
  let cents: number;
  let reason: "overpaid" | "cancelled";

  if (booking.status === "cancelled") {
    if (paymentIntent.metadata.bookingStatus !== "cancelled") {
      console.error(
        `refundOverpayment: $${(paymentIntent.amount / 100).toFixed(2)} (${paymentIntent.id}) arrived on cancelled booking ${bookingId}, and the booking may still have been live when the payment was created. Review by hand under the cancellation terms.`
      );
      return;
    }
    cents = paymentIntent.amount - alreadyRefunded;
    reason = "cancelled";
  } else {
    const excess = clearedCents(booking.payments) - total;
    if (excess <= 0) return;
    cents = Math.min(excess, paymentIntent.amount - alreadyRefunded);
    reason = "overpaid";
  }

  if (cents <= 0) return;

  // One automatic refund per intent. If this intent has already had one and
  // the booking is still over, something other than a single crossed payment
  // is going on, and a person should look before more money moves.
  if (alreadyRefunded > 0) {
    console.error(
      `refundOverpayment: booking ${bookingId} is still over by $${(cents / 100).toFixed(2)} after an automatic refund on ${paymentIntent.id}. Refund by hand.`
    );
    return;
  }

  // Take the refund off the row first, conditional on the row being as read.
  // A miss means another caller for this same intent got there first and is
  // doing the refund, so there is nothing left for this one to do.
  const ownCents = toCents(own.amount);
  const reservedPatch = cents >= ownCents ? { status: "refunded" as const } : { amount: (ownCents - cents) / 100 };
  const { data: reserved } = await admin
    .from("payments")
    .update(reservedPatch)
    .eq("id", own.id)
    .eq("status", "succeeded")
    .eq("amount", own.amount)
    .select("id");
  if (!reserved || reserved.length === 0) return;

  const restore = async () => {
    let undo = admin.from("payments").update({ status: "succeeded", amount: own.amount }).eq("id", own.id);
    undo = "status" in reservedPatch ? undo.eq("status", "refunded") : undo.eq("amount", reservedPatch.amount);
    await undo;
  };

  if (reason === "overpaid") {
    const { data: rows } = await admin.from("payments").select("status, amount").eq("booking_id", bookingId);
    if (clearedCents(rows ?? []) < total) {
      await restore();
      throw new RefundContentionError(
        `refundOverpayment: another refund on booking ${bookingId} is in progress; ${paymentIntent.id} will be looked at again on redelivery`
      );
    }
  }

  try {
    await stripe.refunds.create(
      {
        payment_intent: paymentIntent.id,
        amount: cents,
        metadata: { reason: OVERPAYMENT_REFUND_REASON, bookingId },
      },
      { idempotencyKey: `overpay-refund-${paymentIntent.id}-${cents}` },
    );
  } catch (err) {
    // The row goes back to what was taken. If the refund did in fact go
    // through (a timeout after Stripe acted, say), the next delivery reads it
    // back from Stripe in recordRefunded and records it then.
    await restore();
    throw err;
  }

  console.error(
    `refundOverpayment: refunded $${(cents / 100).toFixed(2)} of ${paymentIntent.id} on booking ${bookingId} (${reason}).`
  );

  const { data: context } = await admin
    .from("bookings")
    .select("users(email, name), trips(name)")
    .eq("id", bookingId)
    .single();
  if (context?.users?.email) {
    try {
      await sendOverpaymentRefundEmail({
        to: context.users.email,
        name: context.users.name,
        bookingId,
        tripName: context.trips?.name ?? "your trip",
        amount: cents / 100,
        reason,
      });
    } catch (err) {
      console.error(`Email send failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

function clearedCents(payments: { status: string; amount: number }[]): number {
  return payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + toCents(p.amount), 0);
}

/**
 * Brings the intent's row in line with the automatic refunds Stripe says it
 * has. Only ever lowers the recorded figure: a row that already reads lower is
 * one a concurrent caller has reserved and is about to refund, and raising it
 * back would let the booking be refunded twice.
 */
async function recordRefunded(admin: Admin, paymentIntent: Stripe.PaymentIntent, refundedCents: number) {
  if (refundedCents <= 0) return;

  const { data: row } = await admin
    .from("payments")
    .select("id, status, amount")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();
  if (!row || row.status !== "succeeded") return;

  const kept = paymentIntent.amount - refundedCents;
  if (toCents(row.amount) <= kept) return;

  await admin
    .from("payments")
    .update(kept <= 0 ? { status: "refunded" } : { amount: kept / 100 })
    .eq("id", row.id)
    .eq("status", "succeeded")
    .eq("amount", row.amount);
}
