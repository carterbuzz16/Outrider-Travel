/**
 * Legal document register, the single source of truth for every policy page.
 *
 * The pages under app/(site) hold the prose; this file holds the metadata that
 * has to stay consistent with it: the title, the version, the dates, and the
 * ordered section list that both the table of contents and the numbered
 * headings are generated from. A section only exists if it is listed here, so
 * the contents and the body can never drift apart.
 *
 * ---------------------------------------------------------------------------
 * HOW TO VERSION A DOCUMENT
 * ---------------------------------------------------------------------------
 * Every document carries a semver-shaped `version`. The parts mean:
 *
 *   MAJOR  A term that materially changes what a traveller owes, gives up, or
 *          can claim, refund windows, the deposit, liability, the release, the
 *          arbitration/venue clause, what data is shared with whom. A MAJOR bump
 *          needs counsel sign-off, a new `effectiveDate`, and notice to anyone
 *          with a live booking. Existing bookings stay on the version that was
 *          in force when they were made unless the traveller accepts the new one.
 *   MINOR  A new section, or a clarification that adds obligations without
 *          changing existing ones (a new supplier category, a new data
 *          recipient). Move `effectiveDate` forward; no re-acceptance needed.
 *   PATCH  Typos, formatting, a changed contact address, a corrected
 *          cross-reference. Nothing a reader could rely on changes.
 *
 * On EVERY edit, bump `lastUpdated`. Only move `effectiveDate` when the new
 * text actually takes force, they differ whenever a change is published ahead
 * of its effective date.
 *
 * `status` is the honest signal about whether the document binds anyone yet:
 *
 *   "draft"     Drafted but not reviewed by a lawyer and not in force. Every
 *               document ships this way. Versions stay at 0.x while draft.
 *   "in-force"  Reviewed by a licensed attorney and live. The first reviewed
 *               release of a document is 1.0.0.
 *
 * Do not set a document to "in-force" as part of a copy edit. That flip is the
 * business's decision to make after review, and it changes what the page tells
 * travellers about whether the terms bind them.
 * ---------------------------------------------------------------------------
 */

export type LegalSectionMeta = {
  /** Anchor id. Also the fragment the footer and cross-references link to. */
  id: string;
  title: string;
};

export type LegalDocumentMeta = {
  /** Route path, without the leading slash. */
  slug: string;
  title: string;
  /** Used in cross-references and the contents header. */
  shortTitle: string;
  /** Feeds the page's Metadata.description. */
  description: string;
  version: string;
  status: "draft" | "in-force";
  /** ISO (YYYY-MM-DD). The date this version takes/took force. */
  effectiveDate: string;
  /** ISO (YYYY-MM-DD). Bump on every edit, however small. */
  lastUpdated: string;
  sections: readonly LegalSectionMeta[];
};

export const TERMS: LegalDocumentMeta = {
  slug: "terms",
  title: "Terms of Service",
  shortTitle: "Terms of Service",
  description:
    "The agreement between you and Outrider when you book a departure: deposits, the installment plan, cancellation, weather, suppliers, insurance and liability.",
  version: "1.0.1",
  status: "in-force",
  effectiveDate: "2026-09-08",
  lastUpdated: "2026-09-08",
  sections: [
    { id: "about", title: "Who these terms are between" },
    { id: "eligibility", title: "Eligibility and your account" },
    { id: "trips-and-tiers", title: "Trips, tiers and what is included" },
    { id: "booking-and-deposit", title: "Booking and the deposit" },
    { id: "payment-plan", title: "The payment plan and automatic installments" },
    { id: "failed-payments", title: "Missed payments, retries and bank authentication" },
    { id: "cancellation", title: "If you cancel" },
    { id: "outrider-changes", title: "If Outrider cancels or changes a trip" },
    { id: "force-majeure", title: "Weather, snow and events outside anyone's control" },
    { id: "suppliers", title: "Third-party suppliers" },
    { id: "insurance", title: "Travel insurance" },
    { id: "groups-and-transfers", title: "Groups, group codes, transfers and substitutions" },
    { id: "conduct", title: "Conduct, fitness and removal from a trip" },
    { id: "risk", title: "Assumption of risk and release" },
    { id: "liability", title: "Limitation of liability" },
    { id: "site", title: "Using this website" },
    { id: "governing-law", title: "Governing law and disputes" },
    { id: "changes", title: "Changes to these terms" },
    { id: "contact", title: "How to reach us" },
  ],
};

export const PRIVACY: LegalDocumentMeta = {
  slug: "privacy",
  title: "Privacy Policy",
  shortTitle: "Privacy Policy",
  description:
    "What Outrider collects when you join the waitlist or book a trip, where card details actually go, who your information is shared with, and how to have it deleted.",
  version: "1.0.1",
  status: "in-force",
  effectiveDate: "2026-09-08",
  lastUpdated: "2026-09-08",
  sections: [
    { id: "scope", title: "Scope and who is responsible" },
    { id: "what-we-collect", title: "What we collect" },
    { id: "payment-data", title: "Payment information and Stripe" },
    { id: "how-we-use", title: "How we use your information" },
    { id: "cookies", title: "Cookies and session storage" },
    { id: "email", title: "Email, the waitlist and marketing" },
    { id: "logs", title: "Server logs, security and rate limiting" },
    { id: "sharing", title: "Who we share information with" },
    { id: "retention", title: "How long we keep information" },
    { id: "rights", title: "Your choices and your rights" },
    { id: "california", title: "California residents" },
    { id: "eea-uk", title: "Visitors from the EEA and the UK" },
    { id: "children", title: "Children" },
    { id: "security", title: "Security" },
    { id: "changes", title: "Changes to this policy" },
    { id: "contact", title: "How to reach us" },
  ],
};

export const ASSUMPTION_OF_RISK: LegalDocumentMeta = {
  slug: "assumption-of-risk",
  title: "Assumption of Risk, Release and Waiver of Liability",
  shortTitle: "Assumption of Risk",
  description:
    "The risks of skiing, snowboarding and mountain travel on an Outrider departure, and the assumption of risk, release, indemnity and medical authorisation every traveller is asked to sign.",
  version: "1.0.1",
  status: "in-force",
  effectiveDate: "2026-09-08",
  lastUpdated: "2026-09-08",
  sections: [
    { id: "what-this-is", title: "What this document is" },
    { id: "applies-to", title: "Who and what it applies to" },
    { id: "snow-risks", title: "Inherent risks of skiing, snowboarding and mountain travel" },
    { id: "travel-risks", title: "Risks of travel, transport and remote places" },
    { id: "assumption", title: "Express assumption of risk" },
    { id: "fitness", title: "Fitness, ability and suitability" },
    { id: "equipment", title: "Equipment" },
    { id: "release", title: "Release and covenant not to sue" },
    { id: "indemnity", title: "Indemnification" },
    { id: "medical", title: "Medical treatment authorisation" },
    { id: "media", title: "Photography and media release" },
    { id: "insurance", title: "Insurance acknowledgement" },
    { id: "conduct", title: "Alcohol, drugs and conduct" },
    { id: "minors", title: "Travellers under 18" },
    { id: "law", title: "Governing law and venue" },
    { id: "severability", title: "Severability and survival" },
    { id: "acknowledgement", title: "Acknowledgement" },
  ],
};

/** Every legal document, in the order the footer lists them. */
export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  TERMS,
  PRIVACY,
  ASSUMPTION_OF_RISK,
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "7 September 2026" from "2026-09-07".
 *
 * Parsed by hand rather than through `new Date(iso)`, which is UTC midnight and
 * renders as the previous day anywhere west of Greenwich, not something a
 * document that turns on dates should get wrong.
 */
export function formatLegalDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** The section's 1-based position, for numbered headings and the contents. */
export function sectionNumber(doc: LegalDocumentMeta, id: string): number {
  const index = doc.sections.findIndex((section) => section.id === id);
  if (index === -1) {
    // A section rendered but not registered would silently fall out of the
    // contents list, which is exactly the drift this module exists to prevent.
    throw new Error(`Section "${id}" is not registered on the ${doc.slug} document in lib/legal.ts`);
  }
  return index + 1;
}
