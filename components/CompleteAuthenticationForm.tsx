"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// A payment method is already attached to this PaymentIntent (it came from
// an off-session confirm attempt) — the customer only needs to clear the
// bank's 3DS challenge, not re-enter card details, so this uses
// confirmCardPayment directly rather than the Payment Element.
export default function CompleteAuthenticationForm({ clientSecret }: { clientSecret: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);

    const stripe = await stripePromise;
    if (!stripe) {
      setError("Payment system failed to load. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

    if (confirmError) {
      setError(confirmError.message ?? "Authentication failed.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      router.push(`/bookings`);
      router.refresh();
    } else {
      setSubmitting(false);
      setError("Payment did not complete. Please try again or contact support.");
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={submitting}>
        {submitting ? "Authenticating…" : "Complete authentication"}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
