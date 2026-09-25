import { listEmailHtml, TELLURIDE_ROWS } from "./waitlist-welcome";

/**
 * The list's head start: booking is open to them before anyone else. Sent
 * once per member from /admin/launch (lib/early-access.ts has the mechanics).
 *
 * Same shell as the welcome. It deliberately names no time for the public
 * opening: the team flips that by hand, so the email only promises what is
 * true the moment it lands, that the list is in first.
 */

export type EarlyAccessParts = {
  origin: string;
  /** This member's /early-access link, already absolute and escaped. */
  bookingUrl: string;
  unsubscribeUrl: string;
  addressLine: string;
  /** "$1,600", the cheapest package, when there is a published price. */
  fromPrice: string | null;
};

export const EARLY_ACCESS_SUBJECT = "Telluride is open. The list goes first.";
export const EARLY_ACCESS_PREHEADER =
  "Booking is open to the list before anyone else. First pick of the dates and the rooms.";

export function earlyAccessHtml(p: EarlyAccessParts): string {
  return listEmailHtml({
    origin: p.origin,
    preheader: EARLY_ACCESS_PREHEADER,
    title: EARLY_ACCESS_SUBJECT,
    eyebrow: "The list goes first",
    headlineHtml: "You&rsquo;re in<br />before anyone",
    leadHtml:
      "Booking for Telluride is open, to this list and nobody else yet. That means first pick of the dates and the rooms, the two penthouses included. The button below is your way in.",
    rows: [
      ...TELLURIDE_ROWS,
      ["Price", p.fromPrice ? `From ${p.fromPrice} per person, all in` : "All in, one price per person"],
      ["Paying", "10% down holds your spot. The rest comes in two installments, or pay it all at once."],
    ],
    button: { label: "Book your spot", href: p.bookingUrl },
    panel: {
      label: "Bring your people",
      text: "Forward this to the friends you&rsquo;re rooming with. The link works for them too, so you can all book before it opens to everyone.",
    },
    addressLine: p.addressLine,
    unsubscribeUrl: p.unsubscribeUrl,
  });
}
