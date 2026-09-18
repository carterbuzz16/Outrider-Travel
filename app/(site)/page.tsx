import type { Metadata } from "next";
import {
  Button,
  EditorialPair,
  Hero,
  Reveal,
  TripCard,
  WaitlistCTA,
  type Trip,
  cellGridClass,
} from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { UPCOMING_CATEGORIES, VALUE_PROPS } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { formatDateRange, formatPrice, getPublishedTrips, nightCount } from "@/lib/trips";

export const metadata: Metadata = pageMetadata({
  // The layout's template appends "· Outrider"; the home page is the one place
  // that should lead with the brand instead.
  title: "Outrider · College group trips: Telluride ski weeks now, spring break next",
  absoluteTitle: true,
  /*
   * The path is stated explicitly. The root layout sets `canonical: "./"`,
   * which resolves correctly for every route except this one: at the root it
   * produces "/index", so the home page was declaring a URL nobody links to as
   * its canonical, and the real root as a duplicate of it. /index serves 200,
   * so the two were competing.
   */
  path: "/",
  /*
   * Written for the search result, not the page. It names the brand (most
   * searches that find this page are for "Outrider", and Google prefers a
   * description containing the words searched) and the terms people search
   * with: college, group trips, Telluride, ski, spring break. Every claim is
   * one the site already backs: trips are scouted before sale, and staff stay
   * for the duration. It leads with the experience rather than a contrast, as
   * the marketing lead asked. Under 160 characters so it is not cut off.
   */
  description:
    "Outrider hosts small-group trips for college students: Telluride ski weeks now, spring break next. We scout it, plan it and come along. Bring your friends.",
});

// The trip list changes when the team publishes or edits a departure, not on
// every request. Five minutes keeps the page static and cheap while making an
// admin change show up on its own.
export const revalidate = 300;

/** One per value prop, in the order VALUE_PROPS declares them. */
const SPREAD_IMAGES = [
  { src: "/images/people/friends-snow-throw.jpg", alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow." },
  { src: "/images/people/friends-candlelit-dinner.jpg", alt: "A group of friends in hoodies sharing dinner at a long candlelit table in a timber dining room." },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines." },
  { src: "/images/telluride/ridge.jpg", alt: "Last light on the peaks above the canyon." },
];

export default async function HomePage() {
  const trips = await getPublishedTrips();
  const featured = trips.slice(0, 3);

  return (
    <>
      <Hero
        video={{ src: "/video/hero.mp4", poster: "/video/hero-poster.jpg" }}
        eyebrow="Telluride · This winter"
        headline="Bring your people"
        tagline="Four nights at The Peaks. We handle everything else."
        // One button. While nothing can be booked, the first thing to offer is
        // the list; the trip page would have nothing on it to book.
        cta={BOOKINGS_OPEN ? { label: "See the trip", href: "/telluride" } : { label: "Join the list", href: "/waitlist" }}
      />

      {/* ---- what makes Outrider different ---------------------------------- */}
      <main className="scheme-light scheme-paint">
        <section className="shell py-20 md:py-28">
          <div>
            <div className="flex flex-col gap-8">
              {/* The brand book's section label: capitals over a full hairline. */}
              <p className="t-rule-label text-[--text]">What we do</p>
              <h2 className="t-title max-w-[18ch] text-[--text]">
                Your only job is the fun part
              </h2>
              <p className="t-lede max-w-measure">
                We pick the town, stay in the hotel before we book it, plan the
                days and the nights, and come along for the whole thing.
              </p>
            </div>
          </div>

          {/* data-nosnippet: Google was ignoring the meta description and
              quoting the "Someone goes first" paragraph in the search result,
              which reads as a fragment out of context. The copy stays on the
              page and in the index; it just cannot be the snippet. */}
          <div data-nosnippet className="mt-16 flex flex-col gap-20 md:gap-28">
            {VALUE_PROPS.map((prop, i) => (
              <Reveal key={prop.eyebrow}>
                <EditorialPair
                  index={i}
                  eyebrow={prop.eyebrow}
                  title={prop.title}
                  body={prop.body}
                  // Paired to the claim each one makes, in VALUE_PROPS order:
                  // small groups, hosting, all-inclusive pricing, planning.
                  image={SPREAD_IMAGES[i] ?? null}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- upcoming departures ------------------------------------------ */}
        <section className="shell pb-20 md:pb-28">
          <Reveal>
            <p className="t-rule-label text-[--text]">Departures</p>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-5">
                <h2 className="t-title max-w-[16ch] text-[--text]">
                  {featured.length > 0 ? "Pick your week" : "First trips, coming soon"}
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
            <div
              className={`mt-12 grid gap-6 sm:grid-cols-2 ${
                featured.length > 2 ? "lg:grid-cols-3" : ""
              }`}
            >
              {featured.map((trip, i) => {
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
                  // A trip's own page is a teaser before launch; the Telluride
                  // page carries the detail, so a closed card goes there.
                  href:
                    !BOOKINGS_OPEN && trip.destination.toLowerCase().includes("telluride")
                      ? "/telluride"
                      : `/trips/${trip.id}`,
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
                  We&rsquo;re scouting the next trips
                </h3>
                <p className="font-body text-body leading-[1.75] text-[--text-secondary] max-w-measure">
                  A trip shows up here once we&rsquo;ve held the rooms and
                  booked the details. Join the list to hear about it first.
                </p>
                {/* Was /contact, which asked for a message when the button
                    promised a list. */}
                <Button href="/waitlist" variant="secondary">
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
            <p className="t-rule-label text-[--text]">Beyond Telluride</p>
            <h2 className="t-title mt-8 max-w-[20ch] text-[--text]">
              Telluride is just the start
            </h2>
            <p className="t-lede mt-6 max-w-measure">
              Everywhere we go, we stay there first and keep the group small.
              Here&rsquo;s what&rsquo;s next.
            </p>
          </Reveal>

          <div className={cellGridClass(UPCOMING_CATEGORIES.length, "mt-12")}>
            {UPCOMING_CATEGORIES.map((category, i) => (
              <Reveal key={category.name} delay={i * 80}>
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="t-subheading text-[--text]">{category.name}</h3>
                    <span className="t-micro text-[--text-muted]">{category.window}</span>
                  </div>
                  <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                    {category.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <WaitlistCTA id="waitlist" tone="light" className="mt-6" placement="home" />
          </Reveal>
        </section>

        {/* ---- close ---------------------------------------------------------
            No testimonials or press section: Outrider has not run a trip yet,
            and inventing social proof is the one thing the brief rules out. It
            belongs here the moment there is something real to put in it. */}
        {/* Club blue as a single closing panel, the Ski Club tile from the
            brand book. It hands straight into the espresso footer. Short copy
            only: see .scheme-club. */}
        <section className="scheme-club scheme-paint">
          <div className="shell flex flex-col items-start gap-8 py-20 md:py-28">
            <Reveal>
              <h2 className="t-title max-w-[20ch] text-[--text]">
                Four nights in Telluride
              </h2>
            </Reveal>
            <Reveal delay={90}>
              <p data-nosnippet className="t-lede max-w-measure text-[--text-secondary]">
                Four nights, three days on the mountain, the whole crew under
                one roof.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex flex-wrap gap-4">
                {BOOKINGS_OPEN ? (
                  <Button href="/trips" variant="primary" size="lg">
                    View trips
                  </Button>
                ) : (
                  <Button href="/waitlist" variant="primary" size="lg">
                    Join the list
                  </Button>
                )}
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
