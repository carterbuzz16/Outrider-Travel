/**
 * Per-departure facts that are not in the database yet.
 *
 * Read by the public flight guide (/flights) and by the transactional emails,
 * which use these as template variables. The field names are a contract with
 * the email code: do not rename them.
 *
 * Keyed by the trip's start date rather than its id. The date is how the team
 * refers to a departure, it is readable here without a lookup, and it survives
 * a trip being recreated in the admin with a new id. Two departures on the
 * same start date would need this rekeying, which is not a real prospect.
 *
 * EVERY null BELOW MUST BE FILLED IN BEFORE LAUNCH. While a value is null the
 * flight guide shows a "coming soon" note in its place rather than a
 * guess, and an email reading it should leave the line out.
 *
 * If these facts move into the trips table later, keep this getter's shape and
 * have it read from there, so neither caller has to change.
 */

export type TripLogistics = {
  /** The property the group stays at, as it should be written to a traveler. */
  propertyName: string | null;
  /**
   * Latest time to land at Montrose on the first day to make the group
   * transfer, written ready to print, e.g. "2:00 pm Mountain Time on Monday,
   * December 14".
   *
   * The emails no longer read this. The owner settled it in September 2026:
   * there is no time to hit, a flight just has to be on the right day, and
   * the confirmation and chase now say the day and nothing more, taken from
   * the trip's own start and end dates. Only /flights still reads it, and
   * while it is null that page shows its "coming soon" note. If the answer
   * really is "any time that day", this field and its pair below are dead and
   * the flight guide should say the day too.
   */
  arrivalDeadline: string | null;
  /**
   * Earliest a return flight out of Montrose should leave on the last day,
   * written the same way as arrivalDeadline. Same note as above.
   */
  departureEarliest: string | null;
  /** Date rooming requests close, as an ISO date: "YYYY-MM-DD". */
  roomingLockDate: string | null;
  /** Total travelers on the departure. */
  tripCapacity: number | null;
};

const EMPTY: TripLogistics = {
  propertyName: null,
  arrivalDeadline: null,
  departureEarliest: null,
  roomingLockDate: null,
  tripCapacity: null,
};

/** Keyed by trips.start_date. */
const LOGISTICS: Record<string, TripLogistics> = {
  // Telluride, December 14 to 18, 2026.
  "2026-12-14": {
    ...EMPTY,
    // Confirmed by the owner.
    tripCapacity: 100,
    roomingLockDate: "2026-12-01",
  },
  // Telluride, January 4 to 8, 2027.
  "2027-01-04": {
    ...EMPTY,
    // Confirmed by the owner.
    tripCapacity: 50,
    // 13 days out, the same runway the December departure gets, and before
    // the holidays rather than inside them.
    roomingLockDate: "2026-12-22",
  },
};

/**
 * Logistics for one departure, by its start date ("YYYY-MM-DD", as
 * `PublicTrip.startDate` and `trips.start_date` both hold it). An unknown date
 * returns all nulls rather than throwing, so a newly published trip renders
 * with placeholders instead of breaking the page or an email.
 */
export function getTripLogistics(startDate: string): TripLogistics {
  // A copy, so a caller that adjusts the result cannot change it for the next.
  return { ...(LOGISTICS[startDate] ?? EMPTY) };
}

/**
 * True once every departure listed here has both its arrival deadline and its
 * earliest departure. Until then the public pages say the flight guide "will
 * have" the times rather than that it has them.
 */
export function flightTimesPublished(): boolean {
  return Object.values(LOGISTICS).every((l) => Boolean(l.arrivalDeadline && l.departureEarliest));
}
