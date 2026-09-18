import "server-only";
import { getStripe } from "@/lib/stripe";

/*
 * Stopping a card form from taking money.
 *
 * Shared by every path that ends a booking or replaces a checkout: the
 * traveler's own cancel button, the admin's, a stale checkout being released
 * and createBooking replacing a traveler's earlier checkout. One definition of
 * "still open" so they cannot drift apart.
 */

/** Stripe states in which an intent can still take a card. */
export const OPEN_INTENT_STATUSES: readonly string[] = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
];

/**
 * True once the intent can no longer take money: cancelled now, or already.
 * False when it is already moving (processing, succeeded) or Stripe could not
 * be reached, in which case the caller leaves the row for the webhook.
 */
export async function cancelOpenIntent(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === "canceled") return true;
    if (!OPEN_INTENT_STATUSES.includes(intent.status)) return false;
    await stripe.paymentIntents.cancel(paymentIntentId);
    return true;
  } catch {
    return false;
  }
}

/**
 * PostgREST filter for the payment rows whose card form may still be open.
 *
 * Pending and requires_action, plus a checkout row (no scheduled date) marked
 * failed: a declined card leaves its PaymentIntent at requires_payment_method,
 * and the same Elements form will happily take a second card. Every sweep that
 * stops open forms uses this, and cancelOpenIntent then asks Stripe, which
 * refuses anything no longer open. Installment rows marked failed are left to
 * the retry machinery.
 */
export const POSSIBLY_OPEN_PAYMENT_FILTER =
  "status.in.(pending,requires_action),and(status.eq.failed,scheduled_date.is.null)";
