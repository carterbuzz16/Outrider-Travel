import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import {
  Badge,
  Reveal,
  SectionDivider,
  TripCard,
  WaitlistCTA,
  type Trip,
  cellGridClass,
} from "@/components/ui";
import { UPCOMING_CATEGORIES } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { formatDateRange, formatPrice, getPublishedTrips, nightCount } from "@/lib/trips";

export const metadata: Metadata = pageMetadata({
  title: "College group trips: Telluride ski weeks and spring break",
  path: "/trips",
  description:
    "Every Outrider trip for college students: Telluride ski weeks this winter, spring break next. Small groups, one great property, everything planned before you land.",
});

export const revalidate = 300;

export default async function TripsPage() {
  const trips = await getPublishedTrips();

  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <div>
          <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Trips</h1>
          <p className="t-lede mt-8 max-w-measure">
            Every Outrider trip lives here. We&rsquo;re always scouting
            somewhere new, and a trip only goes up once it&rsquo;s ready: the
            hotel held, the plans made, the price set. So the list stays short,
            and every trip on it is one we&rsquo;d happily go on ourselves.
          </p>
        </div>
      </header>

      <SectionDivider variant="rule" className="shell" />

      <section className="shell py-16 md:py-20" aria-labelledby="departures">
        <h2 id="departures" className="sr-only">
          Departures
        </h2>
        {trips.length > 0 ? (
          <div
            className={`grid gap-6 sm:grid-cols-2 ${
              trips.length > 2 ? "lg:grid-cols-3" : ""
            }`}
          >
            {trips.map((trip, i) => {
              const card: Trip = {
                name: trip.name,
                destination: trip.destination,
                dates: formatDateRange(trip.startDate, trip.endDate),
                // No figure while nothing can be bought. A price with no way to act on
                  // it invites the reader to shop it against something else.
                  // Omitted rather than set to "Coming soon": the status badge
                  // at the top of the card already says that, and printing it
                  // twice on one card is the duplication that got fixed once
                  // before with the destination line.
                  price: BOOKINGS_OPEN
                    ? `From ${formatPrice(trip.priceFrom)}`
                    : undefined,
                summary:
                  trip.description ??
                  `${nightCount(trip.startDate, trip.endDate)} nights, everything arranged.`,
                status: trip.status,
                image: trip.images[0]
                  ? { src: trip.images[0], alt: `${trip.name}, ${trip.destination}` }
                  : undefined,
                href: `/trips/${trip.id}`,
              };
              // The first card is above the fold on most screens, so it renders
              // plainly rather than sitting at opacity 0 until hydration.
              return i === 0 ? (
                <TripCard key={trip.id} trip={card} className="h-full" />
              ) : (
                <Reveal key={trip.id} delay={i * 80}>
                  <TripCard trip={card} className="h-full" />
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal>
            <div className="border border-[--rule] bg-[--surface-raised] p-8 md:p-12">
              <p className="t-micro text-[--text-muted]">Nothing open right now</p>
              <h2 className="t-subheading mt-3 text-[--text]">
                New trips on the way
              </h2>
              <p className="mt-4 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                A trip goes up here once the rooms are booked and the tickets
                are held. Here&rsquo;s what we&rsquo;re working on.
              </p>
            </div>
          </Reveal>
        )}
      </section>

      {/* Sits under the cards on purpose: this is the moment someone has
          just read "Coming soon" and wants to know when that changes. */}
      <WaitlistCTA
        id="waitlist"
        placement="trips"
        heading="Hear about it first"
        body="The list hears about every trip before it goes on sale. One email when Telluride opens, and nothing in between."
      />

      {/* ---- what's coming --------------------------------------------------
          Deliberately not trip cards: these have no dates, no price and nothing
          to book, and dressing them as departures would imply otherwise. */}
      <section className="shell pb-24 pt-20 md:pb-32 md:pt-28">
        <Reveal>
          <p className="t-micro mb-10 text-[--text-muted]">Up next</p>
        </Reveal>

        <div className={cellGridClass(UPCOMING_CATEGORIES.length)}>
          {UPCOMING_CATEGORIES.map((category, i) => (
            <Reveal key={category.name} delay={i * 80}>
              <div className="flex h-full flex-col gap-4 bg-[--surface-raised] p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="t-subheading text-[--text]">{category.name}</h3>
                  <Badge tone="neutral">{category.window}</Badge>
                </div>
                <p className="t-micro text-[--text-secondary]">
                  {category.destination}
                </p>
                <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  {category.note}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
