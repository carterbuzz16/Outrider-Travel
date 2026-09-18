"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { computeDepositAmount, computePayInFullAmount } from "@/lib/deposit";
import {
  fromCents,
  isPaymentPlan,
  owedCents,
  parseAmountInput,
  validateBalanceAmount,
  type PaymentPlan,
} from "@/lib/balance";
import { balancePaymentOpen, installmentInFlight } from "@/lib/installments";
import { getOrCreateStripeCustomerId } from "@/lib/customers";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveGroupCode } from "@/lib/group-code";
import { recordAcceptance } from "@/lib/legal-acceptance";
import { BOOKINGS_OPEN } from "@/lib/booking-window";

export async function createBooking(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");
  const requestedGroupCode = String(formData.get("group_code") ?? "").trim() || null;
  // Checked before anything is created. A booking that exists without an
  // acceptance record is exactly the situation this is here to prevent.
  const acceptedTerms = formData.get("accept_terms") === "on";
  // The only thing taken from the form about money is which of two plans was
  // picked, and only if it is one of the two. Every figure is worked out below
  // from the tier row. A form rendered before this field existed sends nothing,
  // which means the deposit, the only plan there was.
  const requestedPlan = String(formData.get("payment_plan") ?? "deposit");
  if (!isPaymentPlan(requestedPlan)) {
    redirect("/bookings/new?error=" + encodeURIComponent("Choose the deposit or paying in full."));
  }
  const plan: PaymentPlan = requestedPlan;

  // Bookings are not open yet. Checked here as well as in the UI, because a
  // hidden button is presentation, not a control: this action is a POST
  // endpoint that anyone can call directly.
  if (!BOOKINGS_OPEN) {
    redirect(
      "/trips?error=" +
        encodeURIComponent("Booking is not open yet. Dates and pricing are final; we will be taking spots shortly."),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A legitimate customer books a handful of trips a year at most — this
  // is generous headroom for real usage while still blocking a scripted
  // loop hammering tier capacity / creating Stripe PaymentIntents.
  const allowed = await checkRateLimit(`booking:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    redirect("/bookings/new?error=Too many booking attempts. Please try again in a bit.");
  }

  // Re-fetch the tier server-side rather than trusting a client-supplied
  // price, and confirm it still belongs to a published trip (RLS enforces
  // this too, but the explicit filter makes the intent clear and gives a
  // clean "no longer available" error instead of an RLS-shaped one).
  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, price, trip_id, trips!inner(status)")
    .eq("id", tierId)
    .eq("trip_id", tripId)
    .eq("trips.status", "published")
    .single();

  if (tierError || !tier) {
    redirect("/bookings/new?error=That trip or tier is no longer available.");
  }

  /*
   * Paying in full takes PAY_IN_FULL_DISCOUNT off the price, and the
   * discounted figure becomes the booking's total_amount: that is the price
   * this traveler agreed to, and there is no other column to put a discount
   * in. deposit_amount is still recorded for a pay-in-full booking, as the
   * share of what they paid that the Terms treat as the non-refundable
   * deposit. Nothing is scheduled against it.
   */
  const totalAmount = plan === "full" ? computePayInFullAmount(tier.price) : tier.price;
  const depositAmount = computeDepositAmount(totalAmount);
  const chargeAmount = plan === "full" ? totalAmount : depositAmount;

  // Stripe will not take less than 50 cents. Only reachable with a tier priced
  // at or under the pay-in-full discount, which is a data-entry slip, not a
  // free trip.
  if (Math.round(chargeAmount * 100) < 50) {
    redirect(
      "/bookings/new?error=" + encodeURIComponent("That package cannot be paid for online. Get in touch and we will sort it out."),
    );
  }

  // Booking/payment writes use the service role: RLS intentionally has no
  // INSERT policy for these tables (see the booking_checkout_rls_policies
  // migration), since payment-relevant rows should never be writable
  // directly by an authenticated client.
  const admin = createAdminClient();

  const groupCodeResult = await resolveGroupCode(admin, tripId, requestedGroupCode);
  if ("error" in groupCodeResult) {
    redirect(`/bookings/new?error=${encodeURIComponent(groupCodeResult.error)}`);
  }

  if (!acceptedTerms) {
    redirect(
      "/bookings/new?error=" +
        encodeURIComponent(
          "Please accept the Terms of Service and the Assumption of Risk to book.",
        ),
    );
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      tier_id: tierId,
      status: "pending",
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      group_code: groupCodeResult.code,
    })
    .select("id")
    .single();

  if (bookingError?.message === "tier_at_capacity") {
    redirect("/bookings/new?error=That tier just sold out. Please pick another.");
  }

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? "Failed to create booking");
  }

  // Before the PaymentIntent, deliberately. If this throws, the booking is
  // still `pending` and no card has been charged, which is a far better
  // failure than money taken against a booking with no record of what the
  // traveler agreed to. recordAcceptance stores the document versions, not a
  // boolean, so the exact text accepted can be reproduced later.
  await recordAcceptance({ bookingId: booking.id, userId: user.id });

  // setup_future_usage attaches the payment method used here to the Stripe
  // Customer on success, so the installment cron can charge it off-session
  // later — no separate SetupIntent needed, since we're already charging a
  // real amount right now (a SetupIntent is for saving a card with no
  // charge, e.g. a $0 auth). A payment in full has no later charges, so its
  // card is not kept.
  const stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });

  // metadata.kind is how the webhook tells a deposit from a payment in full
  // (see paymentKindOf in lib/payments.ts).
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(chargeAmount * 100),
    currency: "usd",
    customer: stripeCustomerId,
    ...(plan === "deposit" ? { setup_future_usage: "off_session" as const } : {}),
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: booking.id, userId: user.id, kind: plan },
  });

  const { error: paymentError } = await admin.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntent.id,
    amount: chargeAmount,
    status: "pending",
  });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  redirect(`/bookings/${booking.id}/pay`);
}

/*
 * An early payment toward a booking's balance, from the bookings page: either
 * everything still owed, or an amount the traveler types.
 *
 * This only creates the PaymentIntent and a `pending` row for it. Nothing
 * about the schedule changes here, because nothing has been paid yet: the
 * installments are reduced by the payment_intent.succeeded webhook once Stripe
 * says the money moved (settleBalancePayment in lib/payments.ts). The card
 * form itself is /bookings/[id]/balance/[paymentId].
 */
export async function startBalancePayment(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const rawAmount = String(formData.get("amount") ?? "");

  if (mode !== "remaining" && mode !== "custom") {
    fail("Choose the remaining balance or an amount.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Each submission creates a PaymentIntent, so this is capped the same way
  // createBooking is.
  const allowed = await checkRateLimit(`balance:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    fail("Too many payment attempts. Please try again in a bit.");
  }

  // RLS ("Users can view own bookings") scopes this to the signed-in user, so
  // someone else's booking id comes back empty.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "deposit_paid") {
    fail("That booking has no balance to pay online.");
  }

  const admin = createAdminClient();

  // What is owed is worked out here from the payments that have cleared. The
  // figure the bookings page showed is never read back.
  const { data: payments } = await admin
    .from("payments")
    .select("status, amount")
    .eq("booking_id", booking.id);

  const owed = owedCents(booking.total_amount, payments ?? []);

  /*
   * Only one early payment is open on a booking at a time, and none while
   * money is already moving. Any earlier attempt the traveler walked away from
   * is cancelled at Stripe, so its card form stops working, before this one
   * exists; otherwise two open forms could each be paid for the full balance.
   * One that is processing or has succeeded without its webhook landing, or an
   * installment the cron is charging right now, would make `owed` above out
   * of date, so this stops rather than offer the wrong figure.
   */
  if (
    (await balancePaymentOpen(admin, booking.id, { cancelOpenOlderThanMs: 0 })) ||
    (await installmentInFlight(admin, booking.id))
  ) {
    fail("A payment on this booking is going through right now. Give it a few minutes, then refresh.");
  }

  let cents: number;
  if (mode === "remaining") {
    cents = owed;
  } else {
    const parsed = parseAmountInput(rawAmount);
    if (parsed === null) {
      fail("Enter an amount in dollars, like 250 or 250.50.");
    }
    cents = parsed;
  }

  const valid = validateBalanceAmount(cents, owed);
  if (!valid.ok) {
    fail(valid.message);
  }

  const stripe = getStripe();
  const stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });

  // No setup_future_usage: the installments that remain keep coming off the
  // card saved with the deposit, and this page says so. metadata.kind is what
  // routes the webhook to settleBalancePayment.
  const paymentIntent = await stripe.paymentIntents.create({
    amount: cents,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: booking.id, userId: user.id, kind: "balance" },
  });

  const { data: row, error } = await admin
    .from("payments")
    .insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: fromCents(cents),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    // No row means no page to pay it on, so the intent must not stay payable.
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    fail("That did not start. Please try again.");
  }

  redirect(`/bookings/${booking.id}/balance/${row.id}`);
}

// Back to the bookings page with the reason on show. A plain function, not a
// const arrow, so TypeScript knows the code after a call is unreachable.
function fail(message: string): never {
  redirect(`/bookings?error=${encodeURIComponent(message)}`);
}

// Self-service cancellation only covers pending/deposit_paid — a
// paid_in_full booking needs human judgment (how much of the trip cost is
// recoverable this close to departure), not a button. Status-only: no
// Stripe refund is issued automatically. If a deposit was already charged,
// treat it as non-refundable unless a refund is handled manually — wire in
// stripe.refunds.create() here instead if that's not the intended policy.
export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view own bookings") already scopes this to the
  // signed-in user's own rows.
  const { data: booking } = await supabase.from("bookings").select("id, status").eq("id", bookingId).single();

  if (!booking || !["pending", "deposit_paid"].includes(booking.status)) {
    redirect("/bookings?error=That booking can't be cancelled online. Get in touch and we'll sort it out.");
  }

  const admin = createAdminClient();

  const { error: bookingError } = await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (bookingError) {
    throw new Error(bookingError.message);
  }

  // Stop the installment cron from charging a cancelled booking's
  // remaining scheduled payments.
  const { error: paymentsError } = await admin
    .from("payments")
    .update({ status: "canceled" })
    .eq("booking_id", bookingId)
    .eq("status", "scheduled");
  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  redirect("/bookings");
}
