/**
 * Whether bookings are open.
 *
 * The trips, tiers, prices and photography are all real and published. This
 * flag only controls whether anyone can put money down yet, so the departures
 * can be shown and built up before they go on sale.
 *
 * Set to `true` to open bookings. Nothing else needs changing: the trip cards,
 * the tier table, the navigation call to action and the server action all read
 * this one value.
 *
 * Deliberately a constant rather than a date. "Open it when we are ready" is
 * the actual rule, and a date would open the flow at midnight on its own,
 * possibly before Stripe or the inbox is ready to receive anything.
 */
export const BOOKINGS_OPEN = false;

/**
 * Whether a trip's own page is public.
 *
 * Tied to the same launch on purpose: before release the departures are teased
 * as a destination, dates and a "from" price, and the itinerary, the packages
 * and the tier pricing stay back. Flipping BOOKINGS_OPEN opens both at once,
 * which is the actual intent, rather than leaving two switches to forget.
 */
export const TRIP_DETAILS_OPEN = BOOKINGS_OPEN;

/** Shown wherever a booking control would otherwise be. */
export const COMING_SOON_LABEL = "Coming soon";

/** Said once, in full, where someone is looking for the button. */
export const COMING_SOON_NOTE =
  "Booking opens shortly. The dates, the packages and the pricing below are final.";
