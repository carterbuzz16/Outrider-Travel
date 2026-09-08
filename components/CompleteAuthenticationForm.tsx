"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Alert, Button } from "@/components/ui";

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
      setError("The payment form did not load. Refresh the page and try again.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

    if (confirmError) {
      setError(confirmError.message ?? "Your bank did not accept the verification.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      router.push(`/bookings`);
      router.refresh();
    } else {
      setSubmitting(false);
      setError("The payment did not complete. Try again, or get in touch and we will sort it out.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleClick}
        disabled={submitting}
        // aria-busy rather than swapping the label alone, so the wait is
        // announced and not only read.
        aria-busy={submitting}
        className="self-start"
      >
        {submitting ? "Verifying" : "Verify with your bank"}
      </Button>

      {error && (
        <Alert tone="error" title="Verification failed">
          {error}
        </Alert>
      )}
    </div>
  );
}
