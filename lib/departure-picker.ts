/*
 * Which departures the booking pages put in front of someone, now that there is
 * more than one kind of trip (3 November 2026). Before spring break every
 * departure was Telluride, so "all of them" was a list of dates. With two lines
 * it would be a list of dates that are not the same trip, which is how someone
 * pays $100 for the wrong one.
 *
 * Pure and client-safe, so the choice can be tested without a page around it.
 */

import { TRIP_LINES, lineForDestination, tripsOnLine, type TripLine } from "@/lib/trip-lines";
import { closeLabel } from "@/lib/signup-deadline";

type Offered = { destination: string; tiers: readonly { id: string; name: string }[] };

/** The line of the first departure that sells this package, by the id or the name a link carries. */
function lineOfPackage<T extends Offered>(open: readonly T[], requestedPackage: string): TripLine | null {
  const wanted = requestedPackage.trim().toLowerCase();
  const trip = open.find((t) =>
    t.tiers.some((tier) => tier.id.toLowerCase() === wanted || tier.name.trim().toLowerCase() === wanted),
  );
  return trip ? lineForDestination(trip.destination) : null;
}

/**
 * What /bookings/new offers when no single trip was asked for.
 *
 * The line comes from ?line=, or from the trip that was asked for and has
 * closed (its booker wants the other week, not another kind of trip), or from
 * a package in the link: /telluride's package buttons say
 * /bookings/new?package=BASE and name no line, and BASE is only ever Telluride.
 *
 * `lineMissed` is a line asked for by name with nothing open on it. The rest is
 * then offered instead, with a line saying so, because the alternative is
 * "nothing is taking bookings" while something is.
 */
export function departuresToOffer<T extends Offered>(
  open: readonly T[],
  { line, requestedPackage }: { line?: TripLine | null; requestedPackage?: string | null },
): { trips: T[]; lineMissed: TripLine | null } {
  const wanted = line ?? (requestedPackage ? lineOfPackage(open, requestedPackage) : null);
  if (!wanted) return { trips: [...open], lineMissed: null };
  const onLine = tripsOnLine(open, wanted);
  return onLine.length > 0 ? { trips: onLine, lineMissed: null } : { trips: [...open], lineMissed: wanted };
}

/** Departures split by line, in the order the site presents them, leaving out lines with none. */
export function departuresByLine<T extends { destination: string }>(trips: readonly T[]): { line: TripLine; trips: T[] }[] {
  return TRIP_LINES.map((line) => ({ line, trips: tripsOnLine(trips, line) })).filter((group) => group.trips.length > 0);
}

/*
 * The empty account's one line, read from the published trips rather than from
 * the table of closing dates: a week can be in that table before it is on sale,
 * and "Punta Cana is open" must not be said of a trip nobody can book yet.
 *
 * Each week is named by its month, unless two weeks of the trip share one
 * (spring break's both are in March), and then by its day. The same rule as
 * howTheRestIsPaid, lib/installments.ts. Counted over closed weeks too, so March
 * 15 is still "March 15" once March 8 has closed. A test copy of a week (a
 * sandbox build's "[seed]" trip) has the same dates, so a date is only named once.
 */
export function openUntilLine(
  trips: readonly { destination: string; startDate: string; bookingClosed: boolean }[],
): string {
  const month = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

  const dates = (list: readonly { startDate: string }[]) => [...new Set(list.map((t) => t.startDate))].sort();

  return departuresByLine(trips)
    .map(({ line, trips: onLine }) => {
      const all = dates(onLine);
      const monthsRepeat = new Set(all.map(month)).size < all.length;
      const open = dates(onLine.filter((t) => !t.bookingClosed));
      const weeks = open.map((start) => `${monthsRepeat ? day(start) : month(start)} until ${closeLabel(start)}`);
      return weeks.length > 0 ? `${line.place} is open: ${weeks.join(", ")}.` : "";
    })
    .filter(Boolean)
    .join(" ");
}
