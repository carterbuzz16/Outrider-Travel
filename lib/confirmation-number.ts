/**
 * The short reference a traveler quotes: "OR-" plus six characters.
 *
 * Derived from the booking id rather than stored, so it needs no column, no
 * migration and no uniqueness bookkeeping, and the email, the confirmation
 * page and the bookings page can never disagree about it. The same id always
 * gives the same number.
 *
 * The six characters are the first 30 bits of the uuid, in Crockford's
 * base 32 (no I, L, O or U, so nothing reads as a 1, a 0 or a rude word over
 * the phone). A v4 uuid's leading bits are random, so 2^30 values: two
 * bookings sharing a number is not a real prospect at this company's scale,
 * and this is a reference for people, never a key the code looks anything up
 * by. Always look a booking up by its id.
 *
 * Pure, so it works in server and client components alike.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function confirmationNumber(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").slice(0, 8);
  // Unreachable for a real booking (ids are uuids), but a page should render
  // something rather than throw over a reference number.
  if (!/^[0-9a-f]{8}$/i.test(hex)) return `OR-${hex.toUpperCase()}`;
  // 8 hex characters are 32 bits; the top 30 make six 5-bit characters.
  let bits = parseInt(hex, 16) >>> 2;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out = ALPHABET[bits & 31] + out;
    bits >>>= 5;
  }
  return `OR-${out}`;
}
