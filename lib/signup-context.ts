/**
 * Where a signup came from: which form on the site, and the campaign that
 * brought the visitor in. Nothing here is personal. It exists so the team can
 * tell whether the Instagram bio or a chapter group chat is what fills the
 * list, which is the one question the list itself cannot answer.
 *
 * `src` is the short tag on a link the team hands out (?src=launch on the
 * event QR code). It is stored on the row, so one night's signups can be
 * pulled out with a single filter.
 *
 * Shared by the waitlist form (app/waitlist-actions.ts) and the $100 code
 * (app/code-offer-actions.ts). Not kept in either: everything a "use server"
 * file exports is a public endpoint.
 */
export type SignupContext = {
  placement?: string;
  src?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
};

// Every field arrives from the browser, so each is trimmed to a short token
// before it gets anywhere near an email body or a column. Anything that does
// not look like a campaign tag is dropped rather than repaired.
export function cleanSignupContext(raw: unknown): SignupContext {
  if (!raw || typeof raw !== "object") return {};
  const out: SignupContext = {};
  for (const key of ["placement", "source", "medium", "campaign", "referrer"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const token = value.trim().slice(0, 80);
    if (/^[\w.\-+ /:]+$/.test(token)) out[key] = token;
  }
  // Stricter than the rest, and lowercased, because it is the column people
  // filter on: "Launch" and "launch " should not be two different nights.
  const src = (raw as Record<string, unknown>).src;
  if (typeof src === "string") {
    const token = src.trim().toLowerCase();
    if (/^[a-z0-9_-]{1,40}$/.test(token)) out.src = token;
  }
  return out;
}
