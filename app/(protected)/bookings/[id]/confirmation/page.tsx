import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reconcileDepositPayment } from "@/lib/payments";

export default async function ConfirmationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, deposit_amount, payments(stripe_payment_intent_id)")
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  const payment = booking.payments[0];
  // Re-check with Stripe directly rather than trusting DB state, which may
  // lag behind if the webhook hasn't landed yet (e.g. no local forwarding).
  const status = payment?.stripe_payment_intent_id
    ? await reconcileDepositPayment(payment.stripe_payment_intent_id)
    : null;

  return (
    <main>
      <h1>Booking confirmation</h1>
      {status === "succeeded" ? (
        <p>Your deposit of ${booking.deposit_amount} was received. Thank you!</p>
      ) : (
        <p>We&apos;re still confirming your payment ({status ?? "unknown"}). Refresh in a moment.</p>
      )}
    </main>
  );
}
