import { Button } from "@/components/ui";
import { TRAVEL_INSURANCE } from "@/lib/site-content";

/*
 * The travel insurance offer, in the two sizes checkout needs.
 *
 * Insurance is in no package, every version of the copy already says so, and
 * this is where people ask about it. Faye is the partner; the link is an
 * affiliate link, so BOTH shapes carry the disclosure. That is not decoration:
 * it is what makes an affiliate link honest, and a traveler with their wallet
 * out is exactly who is owed it. Do not render either of these without it.
 *
 * Outbound and to a third party, so every anchor is target="_blank" with
 * rel="noopener nofollow sponsored" — `sponsored` is the tag search engines
 * expect on a paid link, and opening a new tab keeps a checkout in progress
 * from being navigated away from.
 *
 * Copy and URL live in lib/site-content.ts. Nothing here states what a policy
 * covers; both shapes send people to Faye to read it.
 */

const REL = "noopener noreferrer nofollow sponsored";

/**
 * The full block, for the confirmation page: a heading, the reason, and a
 * button. Quiet enough that it never competes with the trip page panel above
 * it, which is the thing we actually need people to do.
 */
export function TravelInsurancePanel({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="insurance-heading"
      className={`border border-[--rule] p-5 sm:p-6 ${className ?? ""}`}
    >
      <p className="t-micro text-[--text-secondary]">{TRAVEL_INSURANCE.eyebrow}</p>
      <h2
        id="insurance-heading"
        className="mt-2 font-display text-display-s font-medium tracking-title text-[--text]"
      >
        {TRAVEL_INSURANCE.heading}
      </h2>
      <p className="mt-3 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
        {TRAVEL_INSURANCE.body}
      </p>
      <div className="mt-6">
        <Button
          href={TRAVEL_INSURANCE.url}
          variant="secondary"
          size="md"
          target="_blank"
          rel={REL}
        >
          {TRAVEL_INSURANCE.cta}
        </Button>
      </div>
      <p className="mt-5 max-w-measure font-body text-micro leading-[1.6] text-[--text-muted]">
        {TRAVEL_INSURANCE.disclosure}
      </p>
    </section>
  );
}

/**
 * One sentence and a link, for the order panel on the payment step. A note,
 * not an offer: nothing on that page may look like a second thing to buy
 * before the card is entered.
 */
export function TravelInsuranceNote({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="font-body text-body-s leading-[1.65] text-[--text-secondary]">
        <span className="font-medium text-[--text]">Travel insurance isn&rsquo;t included. </span>
        Add your own through {TRAVEL_INSURANCE.provider} if you want it,{" "}
        <a
          href={TRAVEL_INSURANCE.url}
          target="_blank"
          rel={REL}
          className="text-[--accent] underline underline-offset-2"
        >
          a quote takes about a minute
        </a>
        .
      </p>
      <p className="mt-2 font-body text-micro leading-[1.6] text-[--text-muted]">
        {TRAVEL_INSURANCE.disclosure}
      </p>
    </div>
  );
}
