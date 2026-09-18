import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getStripe } from "@/lib/stripe";

// Stripe Customers are created lazily on first checkout rather than at
// signup, since a customer.create call needs nothing we don't already
// have at that point, and most users may never reach checkout.
//
// A stored id is checked with Stripe before it is reused. The checkout
// sandbox runs on test keys against the same database as the live site, so an
// account used there carries a test-mode cus_ that the live keys have never
// heard of ("No such customer"), and it would fail every checkout forever. A
// customer deleted from the dashboard fails the same way. Either is treated as
// no customer at all: a new one is made and written over the old id.
export async function getOrCreateStripeCustomerId(
  admin: SupabaseClient<Database>,
  user: { id: string; email: string }
): Promise<string> {
  const { data: existing } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stored = existing?.stripe_customer_id ?? null;
  if (stored && (await customerExists(stored))) {
    return stored;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });

  // Conditional on the column still holding what was read, so two checkouts
  // racing here cannot overwrite each other's customer: the second write
  // misses, and that caller uses the winner's. The saved card goes with the
  // old customer, because a payment method only works on the customer it is
  // attached to; leaving it would have the installment cron charge a card the
  // new customer does not own.
  let update = admin
    .from("users")
    .update({ stripe_customer_id: customer.id, stripe_default_payment_method_id: null })
    .eq("id", user.id);
  update = stored ? update.eq("stripe_customer_id", stored) : update.is("stripe_customer_id", null);
  const { data: written } = await update.select("id");

  if (written && written.length > 0) {
    if (stored) {
      console.error(`getOrCreateStripeCustomerId: user ${user.id} had ${stored}, which Stripe no longer has; replaced with ${customer.id}`);
    }
    return customer.id;
  }

  // Lost the race. The customer made above is an orphan with nothing on it;
  // removing it is tidiness, not correctness, so a failure is ignored.
  await stripe.customers.del(customer.id).catch(() => undefined);
  const { data: winner } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!winner?.stripe_customer_id) {
    throw new Error(`getOrCreateStripeCustomerId: could not save a Stripe customer for user ${user.id}`);
  }
  return winner.stripe_customer_id;
}

/**
 * Whether Stripe, under the keys this deployment runs with, has this customer.
 * Only a definite "no" (missing, or deleted) returns false. Anything else
 * (Stripe unreachable, say) throws: replacing a good customer on a network blip
 * would orphan the traveler's saved card.
 */
async function customerExists(customerId: string): Promise<boolean> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    return !("deleted" in customer && customer.deleted);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing") return false;
    throw err;
  }
}
