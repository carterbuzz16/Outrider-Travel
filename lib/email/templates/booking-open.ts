import { listEmailHtml, TELLURIDE_ROWS } from "./waitlist-welcome";

/**
 * "Booking is open to everyone": the one reminder to list members who have not
 * booked, sent once per member from /admin/launch (28 September 2026).
 *
 * Same shell as the welcome and the head start. It does not say "your head
 * start is over": at least one member joined after the head-start email went,
 * so the copy only states what is true for everyone it reaches. The one reason
 * to move now is a real one, said the way the booking confirmation says it:
 * each package has a set number of spots, and roommates are placed in the
 * order requests come in. No countdown, no invented scarcity.
 */

export type BookingOpenParts = {
  origin: string;
  unsubscribeUrl: string;
  addressLine: string;
  /** "$1,600", the cheapest package, when there is a published price. */
  fromPrice: string | null;
};

export const BOOKING_OPEN_SUBJECT = "Telluride is open to everyone now";
export const BOOKING_OPEN_PREHEADER =
  "Spots in each package go in the order people book. Book with the friends you're rooming with.";

export function bookingOpenHtml(p: BookingOpenParts): string {
  return listEmailHtml({
    origin: p.origin,
    preheader: BOOKING_OPEN_PREHEADER,
    title: BOOKING_OPEN_SUBJECT,
    eyebrow: "Booking is open",
    headlineHtml: "Open to<br />everyone now",
    leadHtml:
      "Booking for Telluride is open to everyone, not just this list. Each package has a set number of spots and they go in the order people book, so if you&rsquo;re going with friends, this is the week to do it together.",
    rows: [
      ...TELLURIDE_ROWS,
      ["Price", p.fromPrice ? `From ${p.fromPrice} per person, all in` : "All in, one price per person"],
      ["Paying", "10% down holds your spot. The rest comes in two installments, or pay it all at once."],
    ],
    button: { label: "Pick your dates", href: `${p.origin}/telluride#departures` },
    panel: {
      label: "Going with friends?",
      text: "Each of you books your own spot, then tells us who you&rsquo;re rooming with. The earlier those come in, the better the odds we keep your group together.",
    },
    addressLine: p.addressLine,
    unsubscribeUrl: p.unsubscribeUrl,
  });
}
