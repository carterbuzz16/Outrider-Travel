"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, CheckRow } from "@/components/ui";
import { confirmFreeBooking } from "@/app/(protected)/bookings/actions";

/**
 * The payment step of a booking its code pays for in full: no card, so the
 * one box is the agreement alone (the Terms and the Assumption of Risk, as on
 * a paid checkout, without the charge authorization), and the button confirms
 * the place. confirmFreeBooking records the agreement before it confirms
 * anything.
 *
 * No Meta Pixel events, unlike CheckoutForm: a place given away is not a sale,
 * and a $0 Purchase would teach the ads to find people who pay nothing.
 */
export default function ConfirmFreeBookingForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the checkout has been let go (the code went elsewhere): nothing
  // to retry, so the error points the way back instead.
  const [released, setReleased] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // `submitting` disables the button only from the next render; a fast
    // double press would otherwise send twice and show the second one's
    // "not waiting anymore" over a booking that just went through.
    if (!agreed || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    let result: Awaited<ReturnType<typeof confirmFreeBooking>>;
    try {
      result = await confirmFreeBooking(bookingId);
    } catch {
      result = { ok: false, message: "We couldn't reach the server, so nothing was confirmed. Please try again." };
    }

    if (result.ok) {
      router.push(`/bookings/${bookingId}/confirmation`);
      return;
    }
    setError(result.message);
    if (result.href) {
      setReleased(result.href);
      return;
    }
    setSubmitting(false);
    inFlight.current = false;
  }

  return (
    <form onSubmit={handleSubmit}>
      <CheckRow required checked={agreed} disabled={submitting} onChange={(e) => setAgreed(e.target.checked)}>
        I agree to the{" "}
        <Link href="/terms" target="_blank" rel="noreferrer" className={LINK}>
          Terms of Service
        </Link>{" "}
        and the{" "}
        <Link href="/assumption-of-risk" target="_blank" rel="noreferrer" className={LINK}>
          Assumption of Risk and Liability Waiver
        </Link>
        .
      </CheckRow>

      {error && (
        <div className="mt-6">
          <Alert tone="error" title="That didn't go through">
            {error}
            {released && (
              <>
                {" "}
                <Link href={released} className={LINK}>
                  Choose again
                </Link>
              </>
            )}
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={submitting || !agreed || released !== null}
          aria-busy={submitting}
        >
          {released ? "Checkout closed" : submitting ? "Confirming" : "Confirm my place"}
        </Button>
        {!agreed && !submitting && (
          <p className="mt-3 text-center font-body text-body-s text-[--text-secondary]">
            Tick the box above to confirm.
          </p>
        )}
      </div>
    </form>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";
