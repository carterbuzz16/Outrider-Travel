import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { handlePaymentIntentFailed, handlePaymentIntentSucceeded, paymentKindOf } from "@/lib/payments";

/*
 * -- Catching up with Stripe when the webhook does not come ---------------------
 *
 * Stripe only sends webhooks to the production endpoint, so on a preview
 * deployment nothing ever tells the app a payment went through, and even in
 * production a webhook can be late or lost. Until then the booking sits at
 * `pending` and the payment reads as unpaid.
 *
 * syncPaymentFromStripe asks Stripe directly and, if the intent has settled,
 * runs the webhook's own handler for it: handlePaymentIntentSucceeded or
 * handlePaymentIntentFailed from lib/payments.ts, never a lighter copy. Those
 * handlers are idempotent and guard their emails and scheduling on
 * conditional transitions, so whichever of this and the webhook arrives first
 * does the work, and the other finds nothing left to do. That is also why a
 * sync running at the same moment as the webhook is harmless: at most one
 * receipt, one set of installments, one automatic refund.
 *
 * It is called from the confirmation page, the balance payment page, the
 * bookings page (syncRecentPaymentsForUser below), the pay page, and the
 * installment cron. It never throws: a page must still render when Stripe is
 * unreachable, and the cron must still go on to the next row.
 */

/**
 * Settles one intent from Stripe's answer. Returns the intent as Stripe has
 * it, or null if it could not be read. Pass an intent already retrieved to
 * save a second call.
 */
export async function syncPaymentFromStripe(
  intentOrId: string | Stripe.PaymentIntent,
): Promise<Stripe.PaymentIntent | null> {
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent =
      typeof intentOrId === "string" ? await getStripe().paymentIntents.retrieve(intentOrId) : intentOrId;
  } catch (err) {
    console.error(`syncPaymentFromStripe: could not read ${intentOrId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  try {
    if (paymentIntent.status === "succeeded") {
      await handlePaymentIntentSucceeded(paymentIntent);
    } else if (
      paymentIntent.status === "requires_payment_method" &&
      paymentIntent.last_payment_error &&
      // The installment branch of the failure handler counts an attempt each
      // time it runs, which is right once per webhook but not once per page
      // load. Installment failures are left to the webhook; the cron retries
      // a row that never heard back on its own schedule anyway.
      paymentKindOf(paymentIntent) !== "installment"
    ) {
      await handlePaymentIntentFailed(paymentIntent);
    }
  } catch (err) {
    console.error(
      `syncPaymentFromStripe: handling ${paymentIntent.id} failed: ${err instanceof Error ? err.message : err}`
    );
  }

  return paymentIntent;
}

// How far back, and how many, the bookings page looks. A card form a traveler
// walked away from a week ago is not worth a Stripe call on every page load,
// and the cron catches anything older.
const RECENT_DAYS = 7;
const MAX_PER_LOAD = 5;

/**
 * Settles any of this traveler's payments that Stripe knows about and the
 * database does not yet: the rows still `pending` with an intent.
 *
 * The payments table has no created_at, so "recent" comes from Stripe: one
 * list call for this customer's intents from the last week (newest first),
 * matched against their pending rows, at most five of them handled, all at
 * once. Returns how many were settled, so the page knows to read again.
 */
export async function syncRecentPaymentsForUser(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();

    const [{ data: profile }, { data: rows }] = await Promise.all([
      admin.from("users").select("stripe_customer_id").eq("id", userId).maybeSingle(),
      admin
        .from("payments")
        .select("stripe_payment_intent_id, bookings!inner(user_id)")
        .eq("bookings.user_id", userId)
        .eq("status", "pending")
        .not("stripe_payment_intent_id", "is", null),
    ]);

    const pending = new Set((rows ?? []).map((r) => r.stripe_payment_intent_id));
    if (!profile?.stripe_customer_id || pending.size === 0) return 0;

    const recent = await getStripe().paymentIntents.list({
      customer: profile.stripe_customer_id,
      created: { gte: Math.floor(Date.now() / 1000) - RECENT_DAYS * 24 * 60 * 60 },
      limit: 20,
    });

    const settled = recent.data
      .filter((pi) => pending.has(pi.id))
      .filter((pi) => pi.status === "succeeded" || (pi.status === "requires_payment_method" && pi.last_payment_error))
      .slice(0, MAX_PER_LOAD);

    await Promise.allSettled(settled.map((pi) => syncPaymentFromStripe(pi)));
    return settled.length;
  } catch (err) {
    console.error(`syncRecentPaymentsForUser: ${err instanceof Error ? err.message : err}`);
    return 0;
  }
}

/**
 * The cron's sweep for webhooks that never arrived, across every booking.
 *
 * Reads the last few days of succeeded intents that carry a bookingId and
 * settles any whose row is missing or not yet settled. Run before the cron
 * charges anything, so an installment that was in fact paid is not charged a
 * second time once its idempotency key has expired at Stripe.
 */
export async function syncStalePayments({ days = 3 }: { days?: number } = {}): Promise<number> {
  try {
    const admin = createAdminClient();
    const recent = await getStripe().paymentIntents.list({
      created: { gte: Math.floor(Date.now() / 1000) - days * 24 * 60 * 60 },
      limit: 100,
    });

    const succeeded = recent.data.filter((pi) => pi.status === "succeeded" && pi.metadata.bookingId);
    if (succeeded.length === 0) return 0;

    const { data: rows } = await admin
      .from("payments")
      .select("stripe_payment_intent_id, status")
      .in(
        "stripe_payment_intent_id",
        succeeded.map((pi) => pi.id),
      );
    const settledIds = new Set(
      (rows ?? []).filter((r) => r.status === "succeeded" || r.status === "refunded").map((r) => r.stripe_payment_intent_id),
    );

    const stale = succeeded.filter((pi) => !settledIds.has(pi.id));
    for (const pi of stale) {
      await syncPaymentFromStripe(pi);
    }
    if (stale.length > 0) {
      console.error(`syncStalePayments: settled ${stale.length} payment(s) whose webhook never arrived`);
    }
    return stale.length;
  } catch (err) {
    console.error(`syncStalePayments: ${err instanceof Error ? err.message : err}`);
    return 0;
  }
}
