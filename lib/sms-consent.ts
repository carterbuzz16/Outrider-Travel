/**
 * The SMS opt-in shown on the trip page, and the version stored with it.
 *
 * The wording is the evidence if consent is ever challenged, so it lives here
 * once: the trip page (app/trip/[bookingId]/PortalForms.tsx) renders it from
 * these constants, under the phone field and in the standalone "Text me trip
 * updates" row, and the portal actions store SMS_CONSENT_VERSION on the
 * booking (sms_consent_text_version) next to the tick and the server's
 * timestamp. It used to sit on the booking form; it moved to where the phone
 * number is given, with the wording and version unchanged. Same idea as the versioned legal documents
 * in lib/legal.ts and the rows lib/legal-acceptance.ts writes.
 *
 * CHANGING ANY WORD OF THE TEXT MEANS A NEW VERSION STRING. Never edit the
 * text under an existing version: bookings already made point at it, and it
 * has to keep meaning what those travelers saw. Keep the old wording in the
 * history below when you change it.
 *
 * The copy is the carrier-registration wording from the owner's brief (A2P
 * 10DLC requires the business name, frequency, rates, HELP/STOP and that
 * consent is not a condition of purchase). It names the business by its legal
 * name, "Outrider Travel, LLC" (LEGAL_NAME in lib/site-content.ts); the name
 * registered with The Campaign Registry has to match it exactly.
 *
 * History:
 *   sms-optin-2026-09-18    first version, naming "Outrider LLC". Never shown
 *                           to a traveler: replaced before the opt-in shipped.
 *   sms-optin-2026-09-18.2  names the business as "Outrider Travel, LLC".
 */

export const SMS_CONSENT_VERSION = "sms-optin-2026-09-18.2";

/**
 * The opt-in text, split around the two links so the form can render them as
 * links without the words changing. Joined, the parts are exactly
 * SMS_CONSENT_TEXT.
 */
export const SMS_CONSENT_PARTS = {
  lead:
    "By checking this box, you agree to receive recurring automated text messages from Outrider Travel, LLC about your trip, including logistics and reminders. Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. See our ",
  privacyLabel: "Privacy Policy",
  between: " and ",
  termsLabel: "Terms",
  tail: ".",
} as const;

export const SMS_CONSENT_TEXT =
  SMS_CONSENT_PARTS.lead +
  SMS_CONSENT_PARTS.privacyLabel +
  SMS_CONSENT_PARTS.between +
  SMS_CONSENT_PARTS.termsLabel +
  SMS_CONSENT_PARTS.tail;

/** The form field name. Unchecked sends nothing, which reads as no consent. */
export const SMS_CONSENT_FIELD = "sms_consent";
