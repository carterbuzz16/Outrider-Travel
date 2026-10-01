import { listEmailHtml, TELLURIDE_ROWS } from "./waitlist-welcome";

/**
 * The $100 code by email (lib/code-offer.ts): the code itself, sent the moment
 * it is asked for, then "two days left" and "last day"
 * (app/api/cron/code-offer-reminders).
 *
 * Same shell as the list's emails. Every value that came from outside (the
 * code, the dates, the price) arrives already escaped from lib/email/send.ts.
 *
 * The deadline is the code's real expires_at, said the same way in all three,
 * and the reminders only go while the code still works. The one other reason
 * to move is a true one, said as the booking-open email says it: each package
 * has a set number of spots, and they go in the order people book.
 */

export type CodeOfferKind = "code" | "reminder" | "last-day";

export type CodeOfferParts = {
  kind: CodeOfferKind;
  origin: string;
  /** The code, escaped. */
  code: string;
  /** "Thursday, October 8", escaped. */
  deadline: string;
  /** "Thursday", escaped. */
  weekday: string;
  /** Mountain Time days left, for the reminder's eyebrow. */
  daysLeft: number;
  /** "$1,600", the cheapest package, when there is a published price. Escaped. */
  fromPrice: string | null;
  /** "$100", or null when pay in full has no discount. */
  payInFullOff: string | null;
  /** /bookings/new?code=, absolute and escaped. */
  bookUrl: string;
  unsubscribeUrl: string;
  addressLine: string;
};

export function codeOfferSubject(p: Pick<CodeOfferParts, "kind" | "weekday">): string {
  if (p.kind === "code") return "Your $100 off Telluride";
  if (p.kind === "reminder") return `Your $100 off Telluride ends ${p.weekday}`;
  return "Last day for your $100 off Telluride";
}

export function codeOfferPreheader(p: Pick<CodeOfferParts, "kind" | "code" | "deadline">): string {
  if (p.kind === "last-day") return `Code ${p.code} works until 11:59 PM Mountain Time tonight.`;
  return `Code ${p.code}, good through ${p.deadline}.`;
}

/** The lead paragraph, shared with the plain-text part so the two cannot say different things. */
export function codeOfferLead(p: CodeOfferParts, strong: (code: string) => string): string {
  const withPayInFull = p.payInFullOff
    ? ` It works with the pay-in-full discount too, so paying all at once takes ${p.payInFullOff} more off.`
    : "";
  if (p.kind === "code") {
    return `Your code is ${strong(p.code)}. It takes $100 off one Telluride trip booked by ${p.deadline}.${withPayInFull}`;
  }
  if (p.kind === "reminder") {
    return `Your code ${strong(p.code)} takes $100 off one Telluride trip booked by ${p.deadline}. If your group is still deciding, send them the link today: each package has a set number of spots, and they go in the order people book.`;
  }
  return `Your code ${strong(p.code)} works until 11:59 PM Mountain Time tonight, and then it stops working. Each package has a set number of spots, and they go in the order people book.`;
}

export const CODE_OFFER_PANEL = {
  label: "For the group chat",
  text: "Send them outrider.travel/telluride. Each of you books your own spot, and anyone new can get their own $100 off there.",
};

export const CODE_OFFER_FOOTER =
  "You&rsquo;re getting this because you asked for a $100 code at outrider.travel. We send two reminders before it runs out, and that&rsquo;s all unless you joined the list.";

export function codeOfferHtml(p: CodeOfferParts): string {
  const eyebrow =
    p.kind === "code" ? "It&rsquo;s yours" : p.kind === "reminder" ? (p.daysLeft <= 1 ? "Ends tomorrow" : "Two days left") : "Last day";
  const headlineHtml =
    p.kind === "code" ? "$100 off<br />Telluride" : p.kind === "reminder" ? `$100 off<br />ends ${p.weekday}` : "Last day<br />for $100 off";

  return listEmailHtml({
    origin: p.origin,
    preheader: codeOfferPreheader(p),
    title: codeOfferSubject(p),
    eyebrow,
    headlineHtml,
    leadHtml: codeOfferLead(p, (code) => `<strong style="font-weight:700; letter-spacing:1px;">${code}</strong>`),
    rows: [
      ["Your code", `<strong style="font-weight:700; letter-spacing:1px;">${p.code}</strong>`],
      ["Good through", p.kind === "last-day" ? "Tonight, 11:59 PM Mountain Time" : p.deadline],
      ...TELLURIDE_ROWS,
      ["Price", p.fromPrice ? `From ${p.fromPrice} per person, all in, before your $100` : "All in, one price per person, before your $100"],
    ],
    button: { label: "Book with my code", href: p.bookUrl },
    panel: CODE_OFFER_PANEL,
    addressLine: p.addressLine,
    unsubscribeUrl: p.unsubscribeUrl,
    footerNote: CODE_OFFER_FOOTER,
  });
}
