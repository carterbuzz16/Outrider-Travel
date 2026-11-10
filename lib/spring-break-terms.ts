/*
 * Spring break's trip terms, in Carter's words (10 November 2026). The one place
 * to edit them: his lawyer may revise them.
 *
 * They are shown in full beside the pay button on a spring break booking, above
 * the box that says "I agree to the trip terms." (components/AuthorizeCharge.tsx),
 * and they are their own section of the Terms (app/(site)/terms, "spring-break").
 * So the "terms" row a booking writes to legal_acceptances, with its version and
 * the moment it was ticked, is the record that these were agreed to.
 *
 * Changing a word here changes the Terms: bump TERMS.version in lib/legal.ts in
 * the same change, so every acceptance keeps pointing at the text it agreed to.
 * The balance date must match lib/installments.ts, the date cards are actually
 * charged; tests/spring-break-terms.test.ts fails if the two drift apart.
 *
 * Client-safe: the pay step's checkbox is a client component.
 */
export const SPRING_BREAK_TERMS = {
  /** The checkbox's own words, before the charge authorization that follows them. */
  agree: "I agree to the trip terms.",
  paragraphs: [
    "Your $100 deposit is fully refundable if Outrider doesn't confirm your week by December 1, 2026. Once your week is confirmed, the deposit is non-refundable and applies to your trip balance.",
    "Final balance is due January 8, 2027.",
    "Each traveler is responsible for any damage to their room, resort incidentals, and late-checkout or early-departure fees. A card is required at check-in for incidentals.",
  ],
} as const;

/** The day the trip terms say the balance is due, for the test that checks it against the charge dates. */
export const SPRING_BREAK_TERMS_BALANCE_DATE = "2027-01-08";
