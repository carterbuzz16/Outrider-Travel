import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import CheckoutForm from "@/components/CheckoutForm";

export default async function PayPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, deposit_amount, payments(stripe_payment_intent_id)")
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  if (booking.status !== "pending") {
    redirect(`/bookings/${booking.id}/confirmation`);
  }

  const payment = booking.payments[0];
  if (!payment?.stripe_payment_intent_id) {
    notFound();
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  return (
    <main>
      <h1>Pay deposit</h1>
      <p>Deposit due: ${booking.deposit_amount}</p>
      <CheckoutForm clientSecret={paymentIntent.client_secret!} bookingId={booking.id} />
    </main>
  );
}
