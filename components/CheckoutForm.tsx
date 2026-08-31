"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutForm({
  clientSecret,
  bookingId,
}: {
  clientSecret: string;
  bookingId: string;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm bookingId={bookingId} />
    </Elements>
  );
}

function PaymentForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${bookingId}/confirmation`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      router.push(`/bookings/${bookingId}/confirmation`);
    } else {
      setSubmitting(false);
      setError("Payment did not complete. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p>{error}</p>}
      <button type="submit" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : "Pay deposit"}
      </button>
    </form>
  );
}
