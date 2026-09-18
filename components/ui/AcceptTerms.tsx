import Link from "next/link";
import { CheckRow } from "./Choice";

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
 * stops the form being submitted without it. It is a plain uncontrolled
 * checkbox, so `required` holds the form back before hydration too.
 */
export default function AcceptTerms({ className }: { className?: string }) {
  return (
    <CheckRow name="accept_terms" required className={className}>
      I have read and agree to the{" "}
      <Link href="/terms" target="_blank" rel="noreferrer" className={LINK}>
        Terms of Service
      </Link>{" "}
      and the{" "}
      <Link href="/assumption-of-risk" target="_blank" rel="noreferrer" className={LINK}>
        Assumption of Risk and Liability Waiver
      </Link>
      , including the cancellation and refund policy. I understand my deposit is non-refundable and
      that the balance is charged automatically on a schedule.
    </CheckRow>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";
