"use client";

import Link from "next/link";
import { CheckRow } from "@/components/ui";

export type ScheduledCharge = { dateLabel: string; amountLabel: string };

/**
 * The tick that sits directly above the pay button.
 *
 * AcceptTerms, on the booking form, is agreement to the terms. This is the
 * narrower thing that has to happen at the moment the card is in hand: the
 * traveler authorizes this charge and, on the deposit plan, the later ones,
 * which are taken off-session with nobody present (terms, "Automatic
 * charges"). Saying so in their own tick, with the amounts and dates written
 * out, is what makes those later charges something they agreed to rather than
 * something they scrolled past.
 *
 * Every claim in the label is already made elsewhere and must stay that way:
 * the amounts and dates are the ones the pay page shows, the deposit is
 * non-refundable (terms, "Your deposit is non-refundable"), and the rest of
 * the refund policy is left to the cancellation terms rather than summarized
 * here. The link opens in a new tab so reading it does not cost a half-entered
 * card.
 *
 * Controlled, because CheckoutForm keeps the pay button disabled and refuses to
 * confirm until it is ticked.
 */
export default function AuthorizeCharge({
  checked,
  onChange,
  disabled,
  amountLabel,
  scheduled = [],
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** What is charged now, formatted. */
  amountLabel: string;
  /** The later automatic charges, if this booking is on the deposit plan. */
  scheduled?: ScheduledCharge[];
}) {
  const onPlan = scheduled.length > 0;

  return (
    <CheckRow
      required
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    >
      {onPlan ? (
        <>
          I authorize Outrider to charge{" "}
          <span className="tabular-nums text-[--text]">{amountLabel}</span> to this card today as
          my deposit, and to charge the balance to the same card automatically, without asking me
          again, on the dates shown above:{" "}
          <span className="tabular-nums text-[--text]">{listCharges(scheduled)}</span>. I understand
          the deposit is non-refundable, and I have read the{" "}
        </>
      ) : (
        <>
          I authorize Outrider to charge{" "}
          <span className="tabular-nums text-[--text]">{amountLabel}</span> to this card today, and
          I have read the{" "}
        </>
      )}
      <Link
        href="/terms#cancellation"
        target="_blank"
        rel="noreferrer"
        className="text-[--accent] underline underline-offset-2"
      >
        cancellation terms
      </Link>
      .
    </CheckRow>
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
