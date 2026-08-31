"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { computeDepositAmount } from "@/lib/deposit";
import { getOrCreateStripeCustomerId } from "@/lib/customers";

export async function createBooking(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      tier_id: tierId,
      status: "pending",
      total_amount: totalAmount,
      deposit_amount: depositAmount,
    })
    .select("id")
    .single();

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
