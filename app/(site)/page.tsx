import type { Metadata } from "next";
import {
  Button,
  EditorialPair,
  Hero,
  Reveal,
  SectionDivider,
  TripCard,
  type Trip,
} from "@/components/ui";
import { UPCOMING_CATEGORIES, VALUE_PROPS } from "@/lib/site-content";
import { formatDateRange, formatPrice, getPublishedTrips, nightCount } from "@/lib/trips";

export const metadata: Metadata = {
  // The layout's template appends "· Outrider"; the home page is the one place
  // that should read as the brand alone.
  title: { absolute: "Outrider · Ski weeks, spring break and formals" },
  description:
    "Small-group travel for college. One property booked whole, everything arranged before you land, and the whole price settled up front.",
};

// The trip list changes when the team publishes or edits a departure, not on
// every request. Five minutes keeps the page static and cheap while making an
// admin change show up on its own.
export const revalidate = 300;

/** One per value prop, in the order VALUE_PROPS declares them. */
const SPREAD_IMAGES = [
  { src: "/images/telluride/group.jpg", alt: "A small group together on the mountain." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis racked outside a slopeside lodge in Telluride." },
  { src: "/images/telluride/apres.jpg", alt: "Apres after a day on the mountain." },
  { src: "/images/telluride/ridge.jpg", alt: "A guide leading the way along a ridge." },
];

export default async function HomePage() {
  const trips = await getPublishedTrips();
  const featured = trips.slice(0, 3);

  return (
    <>
      <Hero
        video={{ src: "/video/hero.mp4", poster: "/video/hero-poster.jpg" }}
        eyebrow="Ski weeks · Spring break · Formals"
        headline="Someone rides ahead"
        tagline="One property, booked whole. Everything arranged before you land, transport both directions, staff on the ground, and the price settled long before you go."
        stampText="Outrider · Scouted · Prepared"
        cta={{ label: "View trips", href: "/trips" }}
        secondaryCta={{ label: "Why Outrider", href: "/about" }}
      />

      {/* ---- what makes Outrider different ---------------------------------- */}
      <main className="scheme-light scheme-paint">
        <section className="shell py-20 md:py-28">
          <div>
            <div className="flex flex-col gap-5">
              <div>
                <span className="stamp-type text-[--text-muted]">The difference</span>
              </div>
              <h2 className="t-title max-w-[18ch] text-[--text]">
                Group trips fail on logistics, not destinations
              </h2>
              <p className="t-lede max-w-measure">
                So Outrider takes them off the table. Four things make the
                difference, and all four sit inside the price.
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-20 md:gap-28">
            {VALUE_PROPS.map((prop, i) => (
              <Reveal key={prop.eyebrow}>
                <EditorialPair
                  index={i}
                  eyebrow={prop.eyebrow}
                  title={prop.title}
                  body={prop.body}
                  // Paired to the claim each one makes, in VALUE_PROPS order:
                  // small groups, lodging, all-inclusive pricing, planning.
                  image={SPREAD_IMAGES[i] ?? null}
                />
              </Reveal>
            ))}
          </div>
        </section>

        <SectionDivider variant="rule" className="shell" />

        {/* ---- upcoming departures ------------------------------------------ */}
        <section className="shell py-20 md:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-5">
                <div>
                  <span className="stamp-type text-[--text-muted]">Departures</span>
                </div>
                <h2 className="t-title max-w-[16ch] text-[--text]">
                  {featured.length > 0 ? "Next out the gate" : "The first departures"}
                </h2>
              </div>
              {featured.length > 0 && (
                <Button href="/trips" variant="ghost">
                  All trips
                </Button>
              )}
            </div>
          </Reveal>

          {featured.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((trip, i) => {
                const card: Trip = {
                  name: trip.name,
                  destination: trip.destination,
                  dates: formatDateRange(trip.startDate, trip.endDate),
                  price: `From ${formatPrice(trip.priceFrom)}`,
                  summary:
                    trip.description ??
                    `${nightCount(trip.startDate, trip.endDate)} nights, everything arranged.`,
                  status: trip.status,
                  image: trip.images[0]
                    ? { src: trip.images[0], alt: `${trip.name}, ${trip.destination}` }
                    : undefined,
                  href: `/trips/${trip.id}`,
                };
                return (
                  <Reveal key={trip.id} delay={i * 90}>
                    <TripCard trip={card} className="h-full" />
                  </Reveal>
                );
              })}
            </div>
          ) : (
            /* No published trips yet. Saying so plainly beats an empty grid or
               an invented departure. */
            <Reveal>
              <div className="mt-12 flex flex-col items-start gap-6 border border-[--rule] bg-[--surface-raised] p-8 md:p-12">
                <h3 className="t-subheading text-[--text]">
                  The next departures are being scouted
                </h3>
                <p className="font-body text-body leading-[1.75] text-[--text-secondary] max-w-measure">
                  A departure goes up here once the property is held and the
                  bookings are made, never before. Ask to hear first.
                </p>
                <Button href="/contact" variant="secondary">
                  Join the list
                </Button>
              </div>
            </Reveal>
          )}
        </section>

        {/* ---- what is coming ------------------------------------------------
            Named without dates or prices, because neither exists yet. The point
            is that Outrider is a travel company whose first trip is Telluride,
            not a ski company. */}
        <section className="shell pb-20 md:pb-28">
          <Reveal>
            <h2 className="t-heading max-w-[20ch] text-[--text]">
              Telluride is where this starts, not what it is
            </h2>
            <p className="t-lede mt-6 max-w-measure">
              The same format travels. One property, a capped group, everything
              arranged and one price with all of it inside. These are next.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-px border border-[--rule] bg-[--rule] md:grid-cols-2">
            {UPCOMING_CATEGORIES.map((category, i) => (
              <Reveal key={category.name} delay={i * 80}>
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="t-subheading text-[--text]">{category.name}</h3>
                    <span className="t-micro text-[--text-muted]">{category.window}</span>
                  </div>
                  <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                    {category.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- close ---------------------------------------------------------
            No testimonials or press section: Outrider has not run a trip yet,
            and inventing social proof is the one thing the brief rules out. It
            belongs here the moment there is something real to put in it. */}
        <section className="scheme-charcoal scheme-paint">
          <div className="shell flex flex-col items-start gap-8 py-20 md:py-28">
            <Reveal>
              <h2 className="t-title max-w-[20ch] text-[--text]">
Booked before it is sold
              </h2>
            </Reveal>
            <Reveal delay={90}>
              <p className="t-lede max-w-measure text-[--text-secondary]">
                We walk the property, eat the dinners and sleep in the rooms
                before a departure reaches this page. If it is listed, someone
                has already been.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex flex-wrap gap-4">
                <Button href="/trips" variant="primary" size="lg">
                  View trips
                </Button>
                <Button href="/about" variant="secondary" size="lg">
                  Why Outrider
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
