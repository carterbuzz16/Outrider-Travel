/*
 * The kinds of trip Outrider runs (3 November 2026, when spring break became a
 * real trip beside Telluride). Carter's brief: the site has to read as one
 * brand that does ski and spring break, "not just ski with spring break".
 *
 * A trip's line decides everything that is true of the place rather than of
 * Outrider: which page sells it, which airport it flies into, whether anyone
 * needs rental sizes. Before this, those answers were written as Telluride
 * throughout, so anything asking "which trip is this" should ask here and
 * anything new that differs by trip should be a field here.
 *
 * Worked out from trips.destination, because that is the only thing every
 * caller already has (the emails, the portal, the roster all read it) and it
 * needs no migration. Anything unrecognized is ski: that is every booking made
 * so far, including the "[seed] Seed Mountain" test trips, so the existing
 * behaviour stays the default. A real trip's destination has to contain one of
 * SPRING_BREAK_PLACES to be treated as spring break.
 *
 * Pure and client-safe.
 */

export type TripLineId = "ski" | "spring-break";

export type TripLine = {
  id: TripLineId;
  /** How the brand names it, in a nav or on a card: "Ski", "Spring break". */
  name: string;
  /** The club this line is (Carter, 3 November 2026): "Outrider Beach Club". */
  club: string;
  /** Its lock-up, for `<Logo variant>`. */
  clubLogo: "club" | "beach-club";
  clubLogoStacked: "club-stacked" | "beach-club-stacked";
  /**
   * How much wider this lock-up should be set than the Ski Club one for its mark
   * and OUTRIDER to come out the same size: BEACH CLUB is two letters longer.
   */
  clubLogoRatio: number;
  /** The place, as a headline says it: "Telluride", "Punta Cana". */
  place: string;
  /** The one public page every departure on this line links to (tripPath, lib/trips.ts). */
  path: string;
  /** The hotel, short: "The Peaks", "Zemi Miches". */
  property: string;
  /** Where to book flights to. Flights are never included, on any line. */
  airport: { code: string; name: string };
  /**
   * Whether the trip has gear to fit. When false, the rental half of traveler
   * details (lib/traveler-details.ts) does not exist: nothing asks for it and
   * nothing chases it.
   */
  rentals: boolean;
  /** The list signup's `placement` for this line's way in, when it has its own. */
  waitlistPlacement: string | null;
  /**
   * The rest are what checkout and the trip page say about the place once
   * someone has pressed Reserve (3 November 2026). SKI's are the words those
   * pages have always used, moved here as they were, so nothing a Telluride
   * booker reads changed.
   */
  /** The zone the trip page prints a submission time in, the trip's own. */
  timeZone: string;
  /** The flight guide, at this trip's part of it. */
  flightGuidePath: string;
  /** Beside the trip's name in the checkout picker, when it lists more than one trip. */
  pickerNote: string;
  /** Under the packages at checkout. */
  packagesNote: string;
  /** Checkout's details step: what the legal name and date of birth are for. */
  identityUse: string;
  /** The hint on the Legal name field, wherever it is asked. */
  legalNameHint: string;
  /** The trip page's "For your records" hint, for a booking with no details yet. */
  recordsHint: string;
  /** The confirmation page's one line on why flights come first. */
  flightsWhy: string;
  /** What the trip page's Flights task says before pointing at the guide, if anything. */
  flightsLead: string | null;
  /** "The flight guide ...", finishing the sentence on the trip page. */
  flightGuideHas: string;
};

export const SKI: TripLine = {
  id: "ski",
  name: "Ski",
  club: "Outrider Ski Club",
  clubLogo: "club",
  clubLogoStacked: "club-stacked",
  clubLogoRatio: 1,
  place: "Telluride",
  path: "/telluride",
  property: "The Peaks",
  airport: { code: "MTJ", name: "Montrose" },
  rentals: true,
  waitlistPlacement: null,
  timeZone: "America/Denver",
  flightGuidePath: "/flights",
  pickerNote: "Four nights at The Peaks, ski-in, ski-out, with lift tickets and rentals.",
  packagesNote: "Everyone gets the same days on the mountain and the same nights out. Your package decides the room.",
  identityUse: "Your legal name and date of birth go on your lift tickets and lodging records.",
  legalNameHint: "Exactly as on your driver's license or passport.",
  recordsHint: "For your lift tickets and lodging records, and for travel insurance if you choose to add it.",
  flightsWhy: "Montrose has a handful of winter flights a day. Book before they're gone.",
  flightsLead: null,
  flightGuideHas: "has the airports and the times to land and leave by",
};

/*
 * A passport is said, not collected: nothing here or on the trip page asks for
 * its number. Whether to ever collect one is Carter's decision, since it is the
 * most sensitive thing the site would hold (3 November 2026).
 */
export const SPRING_BREAK_LINE: TripLine = {
  id: "spring-break",
  name: "Spring break",
  club: "Outrider Beach Club",
  clubLogo: "beach-club",
  clubLogoStacked: "beach-club-stacked",
  clubLogoRatio: 798.17 / 724.8,
  place: "Punta Cana",
  path: "/spring-break",
  property: "Zemi Miches",
  airport: { code: "PUJ", name: "Punta Cana" },
  rentals: false,
  waitlistPlacement: "spring-break",
  timeZone: "America/Santo_Domingo",
  flightGuidePath: "/flights#punta-cana",
  pickerNote: "Four nights at Zemi Miches, all-inclusive, on the beach.",
  packagesNote: "Four nights at Zemi Miches, all-inclusive, on the beach, with our team on site the whole trip.",
  identityUse:
    "Your legal name and date of birth go on your lodging records. You need a valid passport for this trip, so use the name on it.",
  legalNameHint: "Exactly as on your passport.",
  recordsHint: "For your lodging records, and for travel insurance if you choose to add it.",
  flightsWhy: "Fly into Punta Cana (PUJ). Your transfers both ways are included, and you need a valid passport.",
  flightsLead: "Fly into Punta Cana (PUJ). Your transfers to the hotel and back are included, and you need a valid passport.",
  flightGuideHas: "has the rest",
};

/** In the order the site presents them. */
export const TRIP_LINES: readonly TripLine[] = [SKI, SPRING_BREAK_LINE];

/** Case-insensitive parts of trips.destination that mean spring break. */
const SPRING_BREAK_PLACES = ["punta cana", "miches", "dominican republic"];

export function lineForDestination(destination: string | null | undefined): TripLine {
  const place = (destination ?? "").toLowerCase();
  return SPRING_BREAK_PLACES.some((name) => place.includes(name)) ? SPRING_BREAK_LINE : SKI;
}

/** The line from a `?line=` value or similar; null for anything else. */
export function lineById(id: string | null | undefined): TripLine | null {
  return TRIP_LINES.find((line) => line.id === id) ?? null;
}

/** The trips on one line, for pages that sell only that line. */
export function tripsOnLine<T extends { destination: string }>(trips: readonly T[], line: TripLine): T[] {
  return trips.filter((trip) => lineForDestination(trip.destination).id === line.id);
}
