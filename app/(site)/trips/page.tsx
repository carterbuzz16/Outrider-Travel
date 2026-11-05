import type { Metadata } from "next";
import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import { Button, Logo, Reveal, TripCard, WaitlistCTA, type Trip } from "@/components/ui";
import { SPRING_BREAK_WEEKS } from "@/lib/site-content";
import { BOOKINGS_OPEN, COMING_SOON_NOTE, TRIP_DETAILS_OPEN } from "@/lib/booking-window";
import { SKI, SPRING_BREAK_LINE, tripsOnLine, type TripLine } from "@/lib/trip-lines";
import { formatDateRange, formatPrice, getPublishedTrips, nightCount, tripPath, type PublicTrip } from "@/lib/trips";

export const metadata: Metadata = pageMetadata({
  title: "All trips and dates",
  path: "/trips",
  description:
    "Every Outrider trip for college students, with dates: ski weeks in Telluride and spring break in Punta Cana. Small groups, one hotel, planned before you land.",
});

export const revalidate = 300;

/*
 * /trips leads with the two lines rather than a flat list of departures (3
 * November 2026, Carter: "we do ski, spring break, etc."). Each line gets the
 * same block: its name, its place, its hotel, a way to its page, then its
 * departures. A new line goes in LINES below.
 *
 * Spring break shows before its trips are published: the dates are announced,
 * so it gets those and its page and no price, since the price comes from the
 * trips. Once a departure is published it becomes a card like any other, and
 * this replaces itself.
 */
const LINES: { line: TripLine; scheme: string; intro: string }[] = [
  { line: SKI, scheme: "scheme-light", intro: "Four nights, ski-in, ski-out at The Peaks." },
  {
    line: SPRING_BREAK_LINE,
    // Stone rather than a rule, so the two lines read apart (no hairlines).
    scheme: "scheme-stone",
    intro: "Four nights, all-inclusive at Zemi Miches, an hour and a half up the coast.",
  },
];

function toCard(trip: PublicTrip): Trip {
  return {
    name: trip.name,
    destination: trip.destination,
    dates: formatDateRange(trip.startDate, trip.endDate),
    // No figure while nothing can be bought. A price with no way to act on it
    // invites the reader to shop it against something else. Omitted rather than
    // set to "Coming soon": the status badge at the top of the card already says
    // that, and printing it twice on one card is the duplication that got fixed
    // once before with the destination line. Prices are public with the rest of
    // the trip detail, even while paying is list-only (DETAILS_PUBLIC).
    price: TRIP_DETAILS_OPEN ? `From ${formatPrice(trip.priceFrom)}` : undefined,
    summary: trip.description ?? `${nightCount(trip.startDate, trip.endDate)} nights, everything arranged.`,
    status: trip.status,
    image: trip.images[0] ? { src: trip.images[0], alt: `${trip.name}, ${trip.destination}` } : undefined,
    // Every Telluride departure is the one /telluride page, every spring break
    // one /spring-break.
    href: tripPath(trip),
  };
}

export default async function TripsPage() {
  const trips = await getPublishedTrips();

  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <div>
          <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Where we&rsquo;re going</h1>
          <p className="t-lede mt-8 max-w-measure">
            Ski in Telluride, spring break in Punta Cana. One hotel for the whole
            group, and our team there the whole trip.
          </p>
        </div>
      </header>

      {LINES.map(({ line, scheme, intro }, group) => {
        const departures = tripsOnLine(trips, line);
        const headingId = `line-${line.id}`;
        return (
          <section
            key={line.id}
            id={line.id}
            className={`${scheme} scheme-paint scroll-mt-24 md:scroll-mt-32`}
            aria-labelledby={headingId}
          >
            <div className="shell py-16 md:py-24">
              <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
                <div>
                  <Logo variant={line.clubLogo} width={`${16 * line.clubLogoRatio}rem`} className="max-w-full text-[--text]" />
                  <h2 id={headingId} className="t-title mt-6 text-[--text]">
                    {line.place}
                  </h2>
                  <p className="t-lede m-0 mt-5 max-w-measure">{intro}</p>
                </div>
                <Button href={line.path} variant="secondary">
                  See the trip
                </Button>
              </div>

              {departures.length > 0 && (
                <div
                  className={`mt-10 grid gap-6 sm:grid-cols-2 md:mt-14 ${departures.length > 2 ? "lg:grid-cols-3" : ""}`}
                >
                  {departures.map((trip, i) =>
                    // The first card on the page is above the fold on most screens,
                    // so it renders plainly rather than sitting at opacity 0 until
                    // hydration.
                    group === 0 && i === 0 ? (
                      <TripCard key={trip.id} trip={toCard(trip)} className="h-full" />
                    ) : (
                      <Reveal key={trip.id} delay={i * 80}>
                        <TripCard trip={toCard(trip)} className="h-full" />
                      </Reveal>
                    ),
                  )}
                </div>
              )}

              {departures.length === 0 && line.id === SPRING_BREAK_LINE.id && (
                <Reveal>
                  <div className="scheme-espresso relative isolate mt-10 flex min-h-[320px] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:mt-14 md:min-h-[440px]">
                    <Image
                      src="/images/spring/zemi-aerial.jpg"
                      alt="Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind."
                      fill
                      sizes="(min-width: 1320px) 1224px, 100vw"
                      className="-z-10 object-cover"
                      style={{ objectPosition: "60% 78%" }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-gradient-to-t from-[rgb(31_26_23_/_0.92)] via-[rgb(31_26_23_/_0.66)] to-transparent"
                    />
                    <ul className="m-0 flex list-none flex-col gap-1 p-6 md:p-10">
                      {SPRING_BREAK_WEEKS.map((week) => (
                        <li key={week.startDate} className="t-subheading text-[--text]">
                          {formatDateRange(week.startDate, week.endDate)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        );
      })}

      <WaitlistCTA
        id="waitlist"
        placement="trips"
        heading="Hear about it first"
        body={
          BOOKINGS_OPEN
            ? "New dates and new trips go to this list before they reach the site."
            : TRIP_DETAILS_OPEN
              ? COMING_SOON_NOTE
              : "First dibs on every trip. The list hears before it goes on sale."
        }
      />
    </main>
  );
}
