/**
 * Whether bookings are open.
 *
 * The trips, tiers, prices and photography are all real and published. This
 * flag only controls whether anyone can put money down yet, so the departures
 * can be shown and built up before they go on sale.
 *
 * Set LAUNCHED to `true` to open bookings. Nothing else needs changing: the trip cards,
 * the tier table, the navigation call to action and the server action all read
 * this one value.
 *
 * Deliberately a constant rather than a date. "Open it when we are ready" is
 * the actual rule, and a date would open the flow at midnight on its own,
 * possibly before Stripe or the inbox is ready to receive anything.
 */
const LAUNCHED = false;

/**
 * The checkout sandbox: bookings open on a preview or local build so the
 * Stripe flow can be run end to end without opening the live site.
 *
 * All three must hold, so no single mistake opens it in production:
 *  - NEXT_PUBLIC_CHECKOUT_SANDBOX is "1" (set it on Preview only in Vercel,
 *    or in .env.local);
 *  - the build is not Vercel production (NEXT_PUBLIC_VERCEL_ENV is set by
 *    Vercel, and is absent locally);
 *  - the Stripe publishable key is a test key, so no card is really charged.
 *
 * Every value here is inlined at build time, so changing one needs a redeploy.
 */
export const CHECKOUT_SANDBOX =
  !LAUNCHED &&
  process.env.NEXT_PUBLIC_CHECKOUT_SANDBOX === "1" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" &&
  (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").startsWith("pk_test_");

export const BOOKINGS_OPEN = LAUNCHED || CHECKOUT_SANDBOX;

/**
 * Trips whose name starts with one of these are test data (scripts/seed.ts
 * writes "[seed] "). They are published so they can be booked, but only the
 * sandbox lists them, so they never appear on the live site.
 */
const TEST_TRIP_PREFIXES = ["[seed] ", "[test] "];

export function isTestTrip(name: string): boolean {
  return TEST_TRIP_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Everything about the trips is public (itinerary, rooms, packages, prices)
 * while booking itself is not. The owner's call, 25 September 2026: show the
 * whole trip so a group can decide from the page, and let people pay only
 * through the private link the list is emailed (lib/early-access.ts). Joining
 * the list is how you get that link, so the list captures every booking.
 *
 * Set false to go back to the teaser: dates and length only, trip pages 404.
 */
const DETAILS_PUBLIC = true;

/**
 * Whether a trip's own page, its packages and its prices are public. Always
 * once booking opens to everyone; before that, when DETAILS_PUBLIC says so.
 */
export const TRIP_DETAILS_OPEN = DETAILS_PUBLIC || BOOKINGS_OPEN;

/** Shown wherever a booking control would otherwise be. */
export const COMING_SOON_LABEL = DETAILS_PUBLIC ? "List first" : "Coming soon";

/** Said once, in full, where someone is looking for the button. */
export const COMING_SOON_NOTE = DETAILS_PUBLIC
  ? "Booking goes through the list first. Join, and we'll email you a private link to book."
  : "Booking opens shortly. The dates, the packages and the pricing below are final.";

/** The button that stands in for Reserve while booking is list-only. */
export const LIST_BOOKING_CTA = "Get your booking link";
