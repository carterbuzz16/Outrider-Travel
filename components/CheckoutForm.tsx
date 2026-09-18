"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Alert, Button } from "@/components/ui";
import AuthorizeCharge, { type ScheduledCharge } from "@/components/AuthorizeCharge";
import { acceptTermsForBooking } from "@/app/(protected)/bookings/actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/*
 * The Payment Element renders inside a cross-origin iframe, so none of this
 * app's CSS reaches it. The only lever is Stripe's Appearance API, which is why
 * the values below are read out of the live design tokens rather than restated
 * as hexes: `getComputedStyle` on the document element returns whatever
 * app/globals.css currently resolves --text, --rule-strong and the rest to, so
 * a token change moves the embedded fields with everything else.
 *
 * Fonts are the one thing that cannot come from a token. The two faces are
 * self-hosted through next/font under build-hashed URLs this file can't name,
 * and the iframe has no access to them anyway, so Stripe is pointed at the same
 * family on Google Fonts. That is a third-party request the rest of the
 * site deliberately avoids (see the note in app/layout.tsx) — it is accepted
 * here because it is scoped to Stripe's own frame on this one page, and the
 * alternative is card fields set in Stripe's default system sans.
 */
const STRIPE_FONTS = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500&display=swap",
  },
];

// The site's typeface; see app/layout.tsx.
const BODY_STACK = '"Figtree", ui-sans-serif, system-ui, sans-serif';
const DISPLAY_STACK = BODY_STACK;

/** Reads the semantic layer straight off the document. Returns null on the server. */
function readTokens() {
  if (typeof window === "undefined") return null;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    surfaceRaised: v("--surface-raised") || "#faf8f4",
    text: v("--text") || "#3e342f",
    textSecondary: v("--text-secondary") || "#6b635c",
    textMuted: v("--text-muted") || "#6b635c",
    accent: v("--accent") || "#386579",
    flagInk: v("--flag-ink") || "#9c4f2e",
    rule: v("--rule") || "rgba(62, 52, 47, 0.18)",
    ruleStrong: v("--rule-strong") || "rgba(62, 52, 47, 0.5)",
    radius: v("--radius") || "2px",
  };
}

function buildAppearance(): Appearance {
  const t = readTokens();

  const base: Appearance = {
    theme: "stripe",
    labels: "above",
    variables: {
      fontFamily: BODY_STACK,
      fontSizeBase: "17px",
      fontLineHeight: "1.5",
      spacingUnit: "4px",
      borderRadius: t?.radius ?? "2px",
      colorBackground: t?.surfaceRaised ?? "#faf8f4",
      colorText: t?.text ?? "#3e342f",
      colorTextSecondary: t?.textSecondary ?? "#6b635c",
      colorTextPlaceholder: t?.textMuted ?? "#6b635c",
      colorPrimary: t?.accent ?? "#386579",
      colorDanger: t?.flagInk ?? "#9c4f2e",
      iconColor: t?.textSecondary ?? "#6b635c",
    },
    rules: {
      // The same hairline box every control in components/ui/Field.tsx wears:
      // 1px rule on the raised ground, square corners, no inner shadow.
      ".Input": {
        border: `1px solid ${t?.ruleStrong ?? "rgba(62, 52, 47, 0.5)"}`,
        boxShadow: "none",
        padding: "12px 14px",
      },
      ".Input:hover": {
        border: `1px solid ${t?.textSecondary ?? "#6b635c"}`,
      },
      ".Input:focus": {
        border: `1px solid ${t?.accent ?? "#386579"}`,
        boxShadow: "none",
        outline: `2px solid ${t?.accent ?? "#386579"}`,
        outlineOffset: "2px",
      },
      ".Input--invalid": {
        border: `1px solid ${t?.flagInk ?? "#9c4f2e"}`,
        boxShadow: "none",
      },
      // Labels and errors borrow the tracked Medium capitals of Field's own
      // <label> (.t-micro: 11px, 0.12em), so a Stripe field reads as part of
      // the same form.
      ".Label": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.12em",
        fontWeight: "500",
        textTransform: "uppercase",
        color: t?.textSecondary ?? "#6b635c",
        marginBottom: "8px",
      },
      ".Error": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.12em",
        fontWeight: "500",
        textTransform: "uppercase",
        color: t?.flagInk ?? "#9c4f2e",
      },
      ".Tab": {
        border: `1px solid ${t?.rule ?? "rgba(62, 52, 47, 0.18)"}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        border: `1px solid ${t?.accent ?? "#386579"}`,
        boxShadow: "none",
        color: t?.accent ?? "#386579",
      },
      ".TabLabel": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.12em",
        fontWeight: "500",
        textTransform: "uppercase",
      },
    },
  };

  return base;
}

export default function CheckoutForm({
  clientSecret,
  bookingId,
  /** Rendered into the submit label, so the button says what it takes. */
  amountLabel,
  /** The later automatic charges the traveler is authorizing, on the deposit plan. */
  scheduledCharges,
  /** Replaces the default "Pay $X deposit" when the charge is not a deposit. */
  submitLabel,
  /** Where to land once paid. Defaults to the booking's confirmation page. */
  returnPath,
  /**
   * The booking's first payment: the one box also agrees to the Terms and the
   * Assumption of Risk, and that agreement is recorded before the card is
   * confirmed. Off for balance payments, which were agreed to at booking.
   */
  acceptTerms = false,
}: {
  clientSecret: string;
  bookingId: string;
  amountLabel: string;
  scheduledCharges?: ScheduledCharge[];
  submitLabel?: string;
  returnPath?: string;
  acceptTerms?: boolean;
}) {
  // Computed once per mount. The result never reaches the DOM this component
  // renders, only Stripe's iframe, so the server/client difference is not a
  // hydration mismatch.
  const appearance = useMemo(buildAppearance, []);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance, fonts: STRIPE_FONTS }}>
      <PaymentForm
        bookingId={bookingId}
        acceptTerms={acceptTerms}
        amountLabel={amountLabel}
        scheduledCharges={scheduledCharges}
        label={submitLabel ?? `Pay ${amountLabel} deposit`}
        returnPath={returnPath ?? `/bookings/${bookingId}/confirmation`}
      />
    </Elements>
  );
}

function PaymentForm({
  bookingId,
  acceptTerms,
  amountLabel,
  scheduledCharges,
  label,
  returnPath,
}: {
  bookingId: string;
  acceptTerms: boolean;
  amountLabel: string;
  scheduledCharges?: ScheduledCharge[];
  label: string;
  returnPath: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // The disabled button already stops this; checked again here because the
    // authorization is the point, and a form can be submitted other ways.
    if (!stripe || !elements || !authorized) return;
    // `submitting` disables the button only from the next render, so a fast
    // double press would reach here twice. Confirming one intent twice cannot
    // charge it twice, but the second call fails and would show an error over
    // a payment that is going through.
    if (inFlight.current) return;
    inFlight.current = true;

    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Something went wrong.");
      setSubmitting(false);
      inFlight.current = false;
      return;
    }

    // The agreement is written before the card is confirmed, never after: if
    // it cannot be recorded, nothing is charged. After elements.submit() so a
    // mistyped card number does not get as far as a server round trip.
    if (acceptTerms) {
      let accepted: Awaited<ReturnType<typeof acceptTermsForBooking>>;
      try {
        accepted = await acceptTermsForBooking(bookingId);
      } catch {
        accepted = { ok: false, message: "We could not reach the server, so nothing was charged. Please try again." };
      }
      if (!accepted.ok) {
        setError(accepted.message);
        setSubmitting(false);
        inFlight.current = false;
        return;
      }
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${returnPath}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setSubmitting(false);
      inFlight.current = false;
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      router.push(returnPath);
    } else {
      setSubmitting(false);
      inFlight.current = false;
      setError("Payment did not complete. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={submitting}>
        <legend className="sr-only">Card details</legend>

        {/* The hairline container is ours; everything inside it is Stripe's
            iframe. Padding sits on this box rather than on the frame so the
            fields line up with the rules above and below them. */}
        <div className="border border-[--rule] bg-[--surface-raised] p-4 sm:p-6">
          <PaymentElement />
        </div>

        <p className="mt-3 flex items-start gap-2.5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
          <LockGlyph />
          <span>
            Your card goes straight to Stripe over an encrypted connection. Outrider never sees or
            stores the number.
          </span>
        </p>
      </fieldset>

      <div className="mt-8">
        <AuthorizeCharge
          checked={authorized}
          onChange={setAuthorized}
          disabled={submitting}
          amountLabel={amountLabel}
          scheduled={scheduledCharges}
          withTerms={acceptTerms}
        />
      </div>

      {error && (
        <div className="mt-6">
          <Alert tone="error" title="That payment did not go through">
            {error}
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={!stripe || submitting || !authorized}
          // aria-busy rather than the label alone, so the wait is announced
          // and not only read.
          aria-busy={submitting}
        >
          {submitting ? "Processing" : label}
        </Button>
        {!authorized && !submitting && (
          <p className="mt-3 text-center font-body text-body-s text-[--text-secondary]">
            Tick the box above to pay.
          </p>
        )}
      </div>
    </form>
  );
}

/* A padlock drawn in the same 1px vocabulary as every rule on the page: square
   body, square shackle, no fill. Decorative — the sentence beside it carries
   the meaning. */
function LockGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 14"
      className="mt-[0.42rem] h-3 w-3 shrink-0 text-[--accent]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="0.5" y="5.5" width="11" height="8" />
      <path d="M3 5.5V3.5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
