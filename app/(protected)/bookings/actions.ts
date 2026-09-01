"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { computeDepositAmount } from "@/lib/deposit";
import { getOrCreateStripeCustomerId } from "@/lib/customers";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveGroupCode } from "@/lib/group-code";

export async function createBooking(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");
  const requestedGroupCode = String(formData.get("group_code") ?? "").trim() || null;

  const supabase = createClient();
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

  const totalAmount = tier.price;
  const depositAmount = computeDepositAmount(totalAmount);

  // Booking/payment writes use the service role: RLS intentionally has no
  // INSERT policy for these tables (see the booking_checkout_rls_policies
  // migration), since payment-relevant rows should never be writable
  // directly by an authenticated client.
  const admin = createAdminClient();

  const groupCodeResult = await resolveGroupCode(admin, tripId, requestedGroupCode);
  if ("error" in groupCodeResult) {
    redirect(`/bookings/new?error=${encodeURIComponent(groupCodeResult.error)}`);
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

  // setup_future_usage attaches the payment method used here to the Stripe
  // Customer on success, so the installment cron can charge it off-session
  // later — no separate SetupIntent needed, since we're already charging a
  // real amount right now (a SetupIntent is for saving a card with no
  // charge, e.g. a $0 auth).
  const stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(depositAmount * 100),
    currency: "usd",
    customer: stripeCustomerId,
    setup_future_usage: "off_session",
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: booking.id, userId: user.id },
  });

  const { error: paymentError } = await admin.from("payments").insert({
    booking_id: booking.id,
    stripe_payment_intent_id: paymentIntent.id,
    amount: depositAmount,
    status: "pending",
  });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  redirect(`/bookings/${booking.id}/pay`);
}

// Self-service cancellation only covers pending/deposit_paid — a
// paid_in_full booking needs human judgment (how much of the trip cost is
// recoverable this close to departure), not a button. Status-only: no
// Stripe refund is issued automatically. If a deposit was already charged,
// treat it as non-refundable unless a refund is handled manually — wire in
// stripe.refunds.create() here instead if that's not the intended policy.
export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");

  const supabase = createClient();
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
    redirect("/bookings?error=That booking can't be cancelled online — contact us directly.");
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
