import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { INSTALLMENT_RETRY_AFTER_DAYS, MAX_INSTALLMENT_ATTEMPTS } from "@/lib/payments";
import { BALANCE_PAYMENT_HOLD_HOURS, balancePaymentOpen, reconcileInstallments } from "@/lib/installments";
import { syncPaymentFromStripe, syncStalePayments } from "@/lib/stripe-sync";

// Plain !== leaks timing information proportional to how many leading
// characters match, which could help an attacker guess CRON_SECRET one
// byte at a time. Hashing both sides to a fixed-length digest first avoids
// needing equal-length inputs (timingSafeEqual throws on a length
// mismatch) while keeping the actual comparison constant-time.
function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Triggered daily by Vercel Cron (see vercel.json). Finds installments that
// are due (or due for a retry) and attempts an off-session charge against
// the customer's saved payment method. Status/attempt_count are NOT set
// here — Stripe stays the single source of truth, same as the rest of this
// codebase, via the payment_intent.succeeded / payment_intent.payment_failed
// webhook (see lib/payments.ts). This route only records that an attempt
// was made (stripe_payment_intent_id, last_attempted_at), which the retry
// gate below depends on.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
    /*
   * Fail closed when unset. Otherwise the template literal below produces the
   * literal string "Bearer undefined", and anyone who sends that header is
   * authorized to drive the charger.
   */
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not set. Refusing to run the installment charger.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!timingSafeStringEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // First, settle anything Stripe took whose webhook never arrived (see
  // lib/stripe-sync.ts). Before charging, not after: an installment that was
  // in fact paid still looks due until its row says so.
  await syncStalePayments();

  const { data: due, error } = await admin
    .from("payments")
    .select("id, booking_id, amount, attempt_count, last_attempted_at, stripe_payment_intent_id")
    .eq("status", "scheduled")
    .lte("scheduled_date", today)
    .lt("attempt_count", MAX_INSTALLMENT_ATTEMPTS);

  if (error) {
    console.error(`charge-installments: failed to query due payments: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const retryAfterMs = INSTALLMENT_RETRY_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const eligible = (due ?? []).filter((payment) => {
    if (payment.attempt_count === 0) return true;
    if (!payment.last_attempted_at) return true;
    return Date.now() - new Date(payment.last_attempted_at).getTime() >= retryAfterMs;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ attempted: 0 });
  }

  const bookingIds = Array.from(new Set(eligible.map((p) => p.booking_id)));
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, users(stripe_customer_id, stripe_default_payment_method_id)")
    .in("id", bookingIds);

  const paymentMethodByBooking = new Map(
    (bookings ?? []).map((b) => [
      b.id,
      { customerId: b.users?.stripe_customer_id ?? null, paymentMethodId: b.users?.stripe_default_payment_method_id ?? null },
    ])
  );

  const stripe = getStripe();
  let attempted = 0;

  // Per booking, once: whether its installments can be charged this run.
  const clearToCharge = new Map<string, boolean>();

  for (const payment of eligible) {
    const saved = paymentMethodByBooking.get(payment.booking_id);
    if (!saved?.customerId || !saved.paymentMethodId) {
      console.error(`charge-installments: booking ${payment.booking_id} has no saved payment method, skipping payment ${payment.id}`);
      continue;
    }

    // A row being retried already has an intent from the last attempt. If that
    // one actually went through (or is still going through) and nothing told
    // this app, charging again would take the installment twice. The
    // idempotency key below only covers a repeat within Stripe's 24 hours, and
    // retries are days apart. If Stripe cannot be asked, the row waits.
    if (payment.stripe_payment_intent_id) {
      const previous = await syncPaymentFromStripe(payment.stripe_payment_intent_id);
      if (!previous || previous.status === "succeeded" || previous.status === "processing") {
        continue;
      }
    }

    /*
     * A traveler can pay down the balance from the bookings page at any time,
     * so the schedule read above may already be out of date.
     *
     * If one of those payments could still take money (its card form is open,
     * or it is going through Stripe, or it cleared without its webhook landing
     * yet), the booking is skipped for today: charging now could collect the
     * same balance twice. See balancePaymentOpen for how long an open form
     * holds things up. Otherwise the schedule is brought into line with what
     * is owed before anything is charged, which also covers a balance payment
     * whose webhook adjusted nothing because it met an installment mid-charge.
     */
    if (!clearToCharge.has(payment.booking_id)) {
      const open = await balancePaymentOpen(admin, payment.booking_id, {
        cancelOpenOlderThanMs: BALANCE_PAYMENT_HOLD_HOURS * 60 * 60 * 1000,
      });
      if (!open) await reconcileInstallments(admin, payment.booking_id);
      clearToCharge.set(payment.booking_id, !open);
    }
    if (!clearToCharge.get(payment.booking_id)) {
      console.error(`charge-installments: booking ${payment.booking_id} has a balance payment open, skipping payment ${payment.id} until the next run`);
      continue;
    }

    /*
     * Claim the row before charging it: stamp last_attempted_at, conditional
     * on the row still being a due installment with the timestamp this run
     * read. The update and the amount it returns are one statement, so the
     * figure charged below is the row as it stands after any reconcile, and
     * never one an early payment has since reduced.
     *
     * The stamp is also the lock reconcileInstallments honours (see
     * INSTALLMENT_LOCK_MINUTES): from here until the webhook, nothing reduces
     * this row. And its own writes are conditional on the same timestamp, so
     * if it read the row before this claim, its write misses and it re-reads.
     * A missed claim here means someone else changed the row first, and it is
     * left for the next run.
     */
    const claimedAt = new Date().toISOString();
    let claim = admin
      .from("payments")
      .update({ last_attempted_at: claimedAt })
      .eq("id", payment.id)
      .eq("status", "scheduled")
      .lt("attempt_count", MAX_INSTALLMENT_ATTEMPTS);
    claim = payment.last_attempted_at
      ? claim.eq("last_attempted_at", payment.last_attempted_at)
      : claim.is("last_attempted_at", null);
    const { data: claimed } = await claim.select("id, amount, attempt_count").maybeSingle();

    if (!claimed) continue;

    /*
     * Look again now that the claim is written, for what the check above
     * could not see because it ran first:
     *
     *   - An early payment the traveler started in between. startBalancePayment
     *     writes its row and then looks for claims like this one; this wrote
     *     its claim and now looks for open early payments. Whichever goes
     *     second sees the other, so the two never both go ahead.
     *   - The booking was cancelled in between. The cancellation marks the
     *     scheduled rows canceled, but not a row this run already read.
     *
     * Either way the claim is released (the timestamp put back as it was, so
     * the retry gate is unchanged) and the row waits for the next run. The
     * status read here also goes into the intent's metadata: lib/overpayment.ts
     * uses it to tell a charge made on a live booking from one that was not.
     */
    const [{ data: current }, openNow] = await Promise.all([
      admin.from("bookings").select("status").eq("id", payment.booking_id).single(),
      balancePaymentOpen(admin, payment.booking_id, {
        cancelOpenOlderThanMs: BALANCE_PAYMENT_HOLD_HOURS * 60 * 60 * 1000,
      }),
    ]);
    if (openNow || current?.status !== "deposit_paid") {
      await admin
        .from("payments")
        .update({ last_attempted_at: payment.last_attempted_at })
        .eq("id", payment.id)
        .eq("last_attempted_at", claimedAt);
      console.error(
        `charge-installments: booking ${payment.booking_id} changed while payment ${payment.id} was being claimed; left for the next run`
      );
      continue;
    }

    attempted++;
    try {
      /*
       * The idempotency key is the safety net that matters here.
       *
       * This route deliberately does not write `status` or `attempt_count`
       * (Stripe is the source of truth, via the webhook), so between charging
       * and the webhook arriving the row still looks due. If the webhook is
       * delayed, misconfigured, or this endpoint is called twice, the same
       * installment would be charged again.
       *
       * Keyed on the payment row id and the attempt number, so a genuine retry
       * after a decline still goes through while a repeat of the same attempt
       * is collapsed by Stripe into the original charge. The amount is in the
       * key too: an early payment can reduce an installment without it being
       * a new attempt, and Stripe rejects a reused key sent with a different
       * amount rather than charging the new one.
       */
      const cents = Math.round(claimed.amount * 100);
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: cents,
          currency: "usd",
          customer: saved.customerId,
          payment_method: saved.paymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            bookingId: payment.booking_id,
            paymentId: payment.id,
            kind: "installment",
            bookingStatus: current.status,
          },
        },
        { idempotencyKey: `installment-${payment.id}-attempt-${claimed.attempt_count}-${cents}` },
      );

      await admin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntent.id, last_attempted_at: new Date().toISOString() })
        .eq("id", payment.id);
    } catch (err) {
      const paymentIntentId =
        err instanceof Stripe.errors.StripeCardError ? err.payment_intent?.id : undefined;

      await admin
        .from("payments")
        .update({
          stripe_payment_intent_id: paymentIntentId ?? undefined,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.error(
        `charge-installments: attempt failed for payment ${payment.id}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  return NextResponse.json({ attempted });
}
