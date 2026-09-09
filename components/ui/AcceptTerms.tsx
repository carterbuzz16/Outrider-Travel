"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "./cn";

/**
 * The tick that has to be there before money moves.
 *
 * Deliberately not pre-checked and not implied by "clicking Book means you
 * agree". A traveler is giving up legal claims arising from an activity with
 * real physical risk, so the acceptance is an affirmative act, the documents
 * are linked directly, and the linked text opens in a new tab so nobody loses
 * a part-filled booking form to read it.
 *
 * The server does not trust this. `createBooking` re-checks `accept_terms`
 * before it creates anything and writes a versioned row to `legal_acceptances`
 * before the PaymentIntent. This component only makes the act explicit and
 * stops the form being submitted without it.
 */
export default function AcceptTerms({ className }: { className?: string }) {
  const id = useId();
  const [checked, setChecked] = useState(false);

  return (
    <div className={cn("border border-[--rule] bg-[--surface-raised] p-5", className)}>
      <div className="flex items-start gap-3.5">
        <input
          id={id}
          name="accept_terms"
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className={cn(
            "mt-1 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-[--rule-strong]",
            "bg-transparent transition-colors duration-fast",
            "checked:border-[--accent-solid] checked:bg-[--accent-solid]",
          )}
        />
        <label
          htmlFor={id}
          className="font-body text-body-s leading-[1.7] text-[--text-secondary]"
        >
          I have read and agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-[--accent] underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and the{" "}
          <Link
            href="/assumption-of-risk"
            target="_blank"
            rel="noreferrer"
            className="text-[--accent] underline underline-offset-2"
          >
            Assumption of Risk and Liability Waiver
          </Link>
          , including the cancellation and refund policy. I understand my
          deposit is non-refundable and that the balance is charged
          automatically on a schedule.
        </label>
      </div>
    </div>
  );
}
