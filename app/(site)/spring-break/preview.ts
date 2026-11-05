import "server-only";
import { departureClosed, SPRING_BREAK_STARTS } from "@/lib/signup-deadline";
import type { PublicTrip } from "@/lib/trips";

/*
 * Two sample departures, so /spring-break can be seen as it will look once the
 * trips are published (3 November 2026). The live database cannot be written to
 * from a build, and nothing is published yet, so without this the page can only
 * show its waitlist state.
 *
 * The same idea as SIGNUPS_CLOSED_PREVIEW (lib/signup-deadline.ts):
 *
 *   SPRING_BREAK_PREVIEW=1 npm run dev        launch config "dev-spring-preview"
 *   SPRING_BREAK_PREVIEW=first-closed         the first week past its close, the
 *                                             state from mid-January on
 *   plus SIGNUPS_CLOSED_PREVIEW=1             both weeks closed
 *
 * Ignored on Vercel production, where only the database decides.
 *
 * Fixtures must never become a booking, so three things keep them on this page:
 * only this route imports this file, so no lib/trips.ts reader can see them;
 * their ids are not uuids, which getPublishedTrip refuses before asking Postgres;
 * and in preview every Reserve on the page links to its own note instead of to
 * checkout (reserveHref in page.tsx), so the ids never reach a URL.
 *
 * Mirrors scripts/spring-break-test-trips.sql, which is the way to run the real
 * flow: real rows, a test card, and the launch config "dev-test-trips".
 */

/** Four nights, so the trip ends four days after it starts. */
function fourNightsFrom(start: string): string {
  const [y, m, d] = start.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 4)).toISOString().slice(0, 10);
}

/** The sample trips, or null when the page should read the database as usual. */
export function springBreakPreview(): PublicTrip[] | null {
  const mode = process.env.SPRING_BREAK_PREVIEW;
  if ((mode !== "1" && mode !== "first-closed") || process.env.VERCEL_ENV === "production") return null;

  return SPRING_BREAK_STARTS.map((start, i) => {
    const closed = departureClosed(start) || (mode === "first-closed" && i === 0);
    return {
      id: `preview-${start}`,
      name: `Preview, ${start}`,
      destination: "Zemi Miches, Punta Cana",
      startDate: start,
      endDate: fourNightsFrom(start),
      description: null,
      logistics: null,
      images: [],
      tiers: [
        {
          id: `preview-tier-${start}`,
          name: "TWO TO A ROOM",
          price: 1200,
          description: "Two to a room with two queen beds, at Zemi Miches.",
          inclusions: ["Four nights, all-inclusive", "Airport transfers, both ways", "A welcome happy hour", "A welcome gift", "Our team on site"],
          maxCapacity: null,
          spotsLeft: null,
          groupExclusive: false,
          claimed: false,
        },
      ],
      priceFrom: 1200,
      spotsLeft: null,
      status: closed ? "soldOut" : "open",
      bookingClosed: closed,
    };
  });
}
