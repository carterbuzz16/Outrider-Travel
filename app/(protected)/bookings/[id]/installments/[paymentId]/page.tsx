import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import CompleteAuthenticationForm from "@/components/CompleteAuthenticationForm";

export default async function InstallmentAuthenticationPage({
  params,
}: {
  params: { id: string; paymentId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view payments for own bookings") already scopes this to
  // the signed-in user's own bookings, so a mismatched id just comes back empty.
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, amount, stripe_payment_intent_id, booking_id")
    .eq("id", params.paymentId)
    .eq("booking_id", params.id)
    .single();

  if (!payment) {
    notFound();
  }

  if (payment.status !== "requires_action" || !payment.stripe_payment_intent_id) {
    redirect("/bookings");
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  return (
    <main>
      <h1>Confirm your payment</h1>
      <p>Your bank requires additional verification to complete this ${payment.amount} installment.</p>
      <CompleteAuthenticationForm clientSecret={paymentIntent.client_secret!} />
    </main>
  );
}
