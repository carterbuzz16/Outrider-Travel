"use client";

import Link from "next/link";
import { CheckRow } from "@/components/ui";

export type ScheduledCharge = { dateLabel: string; amountLabel: string };

/** A trip's own terms, read in full above the box and agreed to in its first words (lib/spring-break-terms.ts). */
export type TripTerms = { agree: string; paragraphs: readonly string[] };

/**
 * The tick that sits directly above the pay button.
 *
 * On the first payment for a booking (`withTerms`) this is the only box in the
 * whole checkout: agreement to the Terms of Service and the Assumption of Risk,
 * and authorization of the charge, in one affirmative act at the moment the
 * card is in hand. The agreement is recorded server-side before the card is
 * confirmed (acceptTermsForBooking, via CheckoutForm). On later payments
 * (paying down a balance) the terms were agreed at booking, so the box is the
 * authorization alone.
 *
 * On the deposit plan the authorization covers the later charges too, which
 * are taken off-session with nobody present (terms, "Automatic charges").
 * Saying so here, with the amounts and dates written out, is what makes those
 * later charges something they agreed to rather than something they scrolled
 * past.
 *
 * Every claim in the label is already made elsewhere and must stay that way:
 * the amounts and dates are the ones the pay page shows, the deposit is
 * non-refundable (terms, "Your deposit is non-refundable"), and the rest of
 * the refund policy is left to the cancellation terms rather than summarized
 * here. The links open in a new tab so reading them does not cost a
 * half-entered card.
 *
 * Controlled, because CheckoutForm keeps the pay button disabled and refuses to
 * confirm until it is ticked.
 *
 * A trip with terms of its own (`tripTerms`, spring break since 10 November 2026)
 * shows them in full above the box, and the box opens with Carter's sentence, "I
 * agree to the trip terms." It names no waiver, since spring break accepts the
 * Terms alone (lib/legal-acceptance.ts), and it drops "the deposit is
 * non-refundable": his terms make it refundable until the week is confirmed.
 */
export default function AuthorizeCharge({
  checked,
  onChange,
  disabled,
  amountLabel,
  scheduled = [],
  withTerms = false,
  tripTerms,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** What is charged now, formatted. */
  amountLabel: string;
  /** The later automatic charges, if this booking is on the deposit plan. */
  scheduled?: ScheduledCharge[];
  /** Also agree to the Terms and the Assumption of Risk (the first payment). */
  withTerms?: boolean;
  /** Agree to these instead, on a trip that has its own. Only with `withTerms`. */
  tripTerms?: TripTerms;
}) {
  const onPlan = scheduled.length > 0;
  const amount = <span className="tabular-nums text-[--text]">{amountLabel}</span>;

  if (withTerms && tripTerms) {
    return (
      <>
        <TripTermsBox terms={tripTerms} />
        <CheckRow required checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}>
          {tripTerms.agree.replace(/trip terms\.?$/, "")}
          <Link href="/terms#spring-break" target="_blank" rel="noreferrer" className={LINK}>
            trip terms
          </Link>
          .{" "}
          {onPlan ? (
            <>
              I authorize Outrider to charge {amount} to this card today as my deposit, and to charge the
              balance to the same card automatically, without asking me again, on the dates shown on this
              page: <span className="tabular-nums text-[--text]">{listCharges(scheduled)}</span>.
            </>
          ) : (
            <>I authorize Outrider to charge {amount} today, by the payment method I chose above.</>
          )}
        </CheckRow>
      </>
    );
  }

  return (
    <CheckRow
      required
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    >
      {withTerms && (
        <>
          I agree to the{" "}
          <Link href="/terms" target="_blank" rel="noreferrer" className={LINK}>
            Terms of Service
          </Link>{" "}
          and the{" "}
          <Link href="/assumption-of-risk" target="_blank" rel="noreferrer" className={LINK}>
            Assumption of Risk and Liability Waiver
          </Link>
          , and{" "}
        </>
      )}
      {onPlan ? (
        <>
          I authorize Outrider to charge {amount} to this card today as my
          deposit, and to charge the balance to the same card automatically, without asking me
          again, on the dates shown on this page:{" "}
          <span className="tabular-nums text-[--text]">{listCharges(scheduled)}</span>. I understand
          the deposit is non-refundable, and I have read the{" "}
        </>
      ) : (
        // "The payment method I chose", not "this card": paying in full can
        // be Klarna (createBooking), and then there is no card on this page.
        <>I authorize Outrider to charge {amount} today, by the payment method I chose above, and I have read the </>
      )}
      <Link href="/terms#cancellation" target="_blank" rel="noreferrer" className={LINK}>
        cancellation terms
      </Link>
      .
    </CheckRow>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";

/** The terms themselves, on the page and not behind a link, so they are read before the box is ticked. */
export function TripTermsBox({ terms }: { terms: TripTerms }) {
  return (
    <div className="mb-5 bg-[--surface-raised] p-4 sm:p-5">
      <p className="t-micro m-0 text-[--text-secondary]">Trip terms</p>
      <div className="mt-2 flex flex-col gap-2 font-body text-body-s leading-[1.55] text-[--text]">
        {terms.paragraphs.map((paragraph) => (
          <p key={paragraph} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

/** "$1,200 on Nov 1, 2026 and $1,200 on Dec 1, 2026", for any number of rows. */
function listCharges(rows: ScheduledCharge[]) {
  const parts = rows.map((r) => `${r.amountLabel} on ${r.dateLabel}`);
  // The dates carry their own commas, so a longer list is split with
  // semicolons to stay readable.
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join("; ")} and ${parts[parts.length - 1]}`;
}
