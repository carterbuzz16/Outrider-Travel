import { LEGAL_NAME } from "@/lib/site-content";

/**
 * The two opt-ins on the waitlist form, and the version stored with them.
 *
 * Same idea as lib/sms-consent.ts (the trip page's text opt-in): the wording
 * is the evidence if consent is ever questioned, so it lives here once, every
 * form renders it from these constants, and each signup row stores
 * WAITLIST_CONSENT_VERSION next to the ticks, the server's timestamps, the IP
 * and the browser it came from.
 *
 * It is a separate version from the trip page's because it covers something
 * different: that one is texts about a trip someone booked, this one is texts
 * and email about trips in general, which is marketing.
 *
 * CHANGING ANY WORD OF THE TEXT MEANS A NEW VERSION STRING. Never edit the
 * text under an existing version: rows already stored point at it, and it has
 * to keep meaning what those people saw. Keep the old wording in the history.
 *
 * History:
 *   waitlist-optin-2026-09-24  first version: the two boxes and the text
 *                              disclosure below, naming LEGAL_NAME.
 */

export const WAITLIST_CONSENT_VERSION = "waitlist-optin-2026-09-24";

/** Required. Unticked, the form will not submit. */
export const EMAIL_CONSENT_LABEL = "Okay to email me about Outrider trips";

/** Optional, and never ticked for anyone. */
export const SMS_CONSENT_LABEL = "Okay to text me about Outrider trips";

/**
 * Shown under the text box. The carrier-registration elements (who is
 * sending, that it is automated marketing, not a condition of purchase,
 * frequency, rates, STOP and HELP), split around the two links so the form can
 * render them as links without the words changing. Joined, the parts are
 * exactly SMS_DISCLOSURE_TEXT.
 */
export const SMS_DISCLOSURE_PARTS = {
  lead: `Recurring automated marketing texts from ${LEGAL_NAME}. Not a condition of purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our `,
  privacyLabel: "Privacy Policy",
  between: " and ",
  termsLabel: "Terms",
  tail: ".",
} as const;

export const SMS_DISCLOSURE_TEXT =
  SMS_DISCLOSURE_PARTS.lead +
  SMS_DISCLOSURE_PARTS.privacyLabel +
  SMS_DISCLOSURE_PARTS.between +
  SMS_DISCLOSURE_PARTS.termsLabel +
  SMS_DISCLOSURE_PARTS.tail;
