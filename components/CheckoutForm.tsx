"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Alert, Button } from "@/components/ui";

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
 * two families on Google Fonts. That is a third-party request the rest of the
 * site deliberately avoids (see the note in app/layout.tsx) — it is accepted
 * here because it is scoped to Stripe's own frame on this one page, and the
 * alternative is card fields set in Stripe's default system sans.
 */
const STRIPE_FONTS = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap",
  },
];

const BODY_STACK = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const DISPLAY_STACK = '"DM Mono", ui-monospace, SFMono-Regular, monospace';

/** Reads the semantic layer straight off the document. Returns null on the server. */
function readTokens() {
  if (typeof window === "undefined") return null;
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    surfaceRaised: v("--surface-raised") || "#ffffff",
    text: v("--text") || "#1a1a1a",
    textSecondary: v("--text-secondary") || "#6b6b6b",
    textMuted: v("--text-muted") || "#686765",
    accent: v("--accent") || "#37646e",
    flagInk: v("--flag-ink") || "#9e501f",
    rule: v("--rule") || "rgba(26, 26, 26, 0.16)",
    ruleStrong: v("--rule-strong") || "rgba(26, 26, 26, 0.42)",
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
      colorBackground: t?.surfaceRaised ?? "#ffffff",
      colorText: t?.text ?? "#1a1a1a",
      colorTextSecondary: t?.textSecondary ?? "#6b6b6b",
      colorTextPlaceholder: t?.textMuted ?? "#686765",
      colorPrimary: t?.accent ?? "#37646e",
      colorDanger: t?.flagInk ?? "#9e501f",
      iconColor: t?.textSecondary ?? "#6b6b6b",
    },
    rules: {
      // The same hairline box every control in components/ui/Field.tsx wears:
      // 1px rule on the raised ground, square corners, no inner shadow.
      ".Input": {
        border: `1px solid ${t?.ruleStrong ?? "rgba(26, 26, 26, 0.42)"}`,
        boxShadow: "none",
        padding: "12px 14px",
      },
      ".Input:hover": {
        border: `1px solid ${t?.textSecondary ?? "#6b6b6b"}`,
      },
      ".Input:focus": {
        border: `1px solid ${t?.accent ?? "#37646e"}`,
        boxShadow: "none",
        outline: `2px solid ${t?.accent ?? "#37646e"}`,
        outlineOffset: "2px",
      },
      ".Input--invalid": {
        border: `1px solid ${t?.flagInk ?? "#9e501f"}`,
        boxShadow: "none",
      },
      // Labels and errors borrow the tracked mono voice used by Field's own
      // <label>, so a Stripe field reads as part of the same form.
      ".Label": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: t?.textSecondary ?? "#6b6b6b",
        marginBottom: "8px",
      },
      ".Error": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: t?.flagInk ?? "#9e501f",
      },
      ".Tab": {
        border: `1px solid ${t?.rule ?? "rgba(26, 26, 26, 0.16)"}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        border: `1px solid ${t?.accent ?? "#37646e"}`,
        boxShadow: "none",
        color: t?.accent ?? "#37646e",
      },
      ".TabLabel": {
        fontFamily: DISPLAY_STACK,
        fontSize: "11px",
        letterSpacing: "0.18em",
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
}: {
  clientSecret: string;
  bookingId: string;
  amountLabel: string;
}) {
  // Computed once per mount. The result never reaches the DOM this component
  // renders, only Stripe's iframe, so the server/client difference is not a
  // hydration mismatch.
  const appearance = useMemo(buildAppearance, []);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance, fonts: STRIPE_FONTS }}>
      <PaymentForm bookingId={bookingId} amountLabel={amountLabel} />
    </Elements>
  );
}

function PaymentForm({ bookingId, amountLabel }: { bookingId: string; amountLabel: string }) {
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
    <form onSubmit={handleSubmit} className="mt-8">
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={submitting}>
        <legend className="t-micro p-0 text-[--text-secondary]">Card details</legend>

        {/* The hairline container is ours; everything inside it is Stripe's
            iframe. Padding sits on this box rather than on the frame so the
            fields line up with the rules above and below them. */}
        <div className="mt-3 border border-[--rule-strong] bg-[--surface-raised] p-4 md:p-5">
          <PaymentElement />
        </div>

        <p className="mt-3.5 flex items-start gap-2.5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
          <LockGlyph />
          <span>
            Your card goes straight to Stripe over an encrypted connection. Outrider never sees or
            stores the number.
          </span>
        </p>
      </fieldset>

      {error && (
        <div className="mt-6">
          <Alert tone="error" title="That payment did not go through">
            {error}
          </Alert>
        </div>
      )}

      <div className="mt-8">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!stripe || submitting}
          // aria-busy rather than the label alone, so the wait is announced
          // and not only read.
          aria-busy={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? "Processing" : `Pay ${amountLabel} deposit`}
        </Button>
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
