import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Button,
  Gallery,
  Plate,
  Reveal,
  SectionDivider,
  StatusBadge,
  TierTable,
  WaitlistCTA,
  cellGridClass,
  cellSpanClass,
  type TierView,
} from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import {
  BOOKINGS_OPEN,
  COMING_SOON_LABEL,
  TRIP_DETAILS_OPEN,
} from "@/lib/booking-window";
import {
  NOT_INCLUDED_NOTE,
  SHARED_INCLUSIONS,
  TELLURIDE_FACTS,
  TELLURIDE_PROPERTY,
  TELLURIDE_ROOMS,
} from "@/lib/site-content";
import {
  availabilityLabel,
  formatDateRange,
  formatPrice,
  getPublishedTrips,
  nightCount,
  type PublicTrip,
} from "@/lib/trips";

/*
 * /telluride: both Telluride departures on one page, and the page that sells
 * the place.
 *
 * This is the landing page the booking emails link to, as
 * https://outrider.travel/telluride and https://outrider.travel/telluride#included.
 * Both URLs are in mail that has already been sent, so the route and the
 * `included` anchor must not be renamed or removed. The anchor renders before
 * launch as well, with whatever inclusion detail is public at that point.
 *
 * Launch gating follows app/(site)/trips/[id]/page.tsx exactly: before
 * TRIP_DETAILS_OPEN the departures are teased as dates and length only, with no
 * price, no packages, no itinerary, no property and no link to a trip page
 * (those 404 until launch). Nothing about a departure is hard-coded: dates,
 * prices and package inclusions all come from the published trips.
 *
 * The order is the order somebody decides in: why this place, what the days
 * look like, where you sleep, which dates, what the price covers, which
 * package, how to get there, and the few questions that are left.
 */

export const metadata: Metadata = pageMetadata({
  title: "Telluride ski weeks",
  path: "/telluride",
  description:
    "Outrider's Telluride departures for college students this winter: the dates, the week, where the group stays, what every package includes, and how to get there.",
});

// Same cadence as /trips, so publishing or editing a departure shows up here
// without a redeploy.
export const revalidate = 300;

const LINK = "text-[--accent] underline underline-offset-4";

/*
 * Alt text describes what is in each photograph, written by looking at them:
 * the filenames in public/images/telluride are unreliable (gondola-night.jpg is
 * a daytime cabin, group.jpg is a lone skier under the gondola).
 */
const HERO_IMAGE = {
  src: "/images/telluride/alpenglow.jpg",
  alt: "Pink alpenglow over the snow-covered San Juan peaks, with ski runs cut through dark forest below.",
};

const GALLERY = [
  { src: "/images/telluride/skiing.jpg", alt: "A skier carving a groomed run high above the town, a gondola cabin passing overhead." },
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick main street and clock tower, a snow-covered peak rising straight up behind." },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines." },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main street at dusk through strings of big colored holiday bulbs, the mountains behind." },
  { src: "/images/telluride/gondola-night.jpg", alt: "A gondola cabin crossing a snowy ridge, the town far below in the valley." },
  { src: "/images/telluride/powder.jpg", alt: "Skiers outside a weathered timber saloon on the mountain on a bright day." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis and snowboards racked in rows in front of a mountain lodge and open slopes." },
];

const EVENING_IMAGE = {
  src: "/images/telluride/dining.jpg",
  alt: "Fire tables and red cushioned chairs under a stone arcade at dusk, a lit Christmas tree beyond.",
};

const PROPERTY_IMAGE = {
  src: "/images/telluride/group.jpg",
  alt: "A Telluride gondola cabin passing over a skier throwing up powder in falling snow.",
};

/** Case-insensitive, so "Telluride, Colorado" and "telluride" both count. */
function isTelluride(trip: PublicTrip): boolean {
  return trip.destination.toLowerCase().includes("telluride");
}

/** "Monday", read without going through a timezone. */
function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** "Four", up to ten; figures after that, which no departure here reaches. */
function spelled(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * The value every trip agrees on, or null when they differ. Lets the page say
 * "four nights" or "Monday to Friday" once for both departures, and quietly
 * stop saying it if the team ever publishes one that runs differently.
 */
function shared<T>(trips: PublicTrip[], pick: (trip: PublicTrip) => T): T | null {
  if (trips.length === 0) return null;
  const first = pick(trips[0]);
  return trips.every((trip) => pick(trip) === first) ? first : null;
}

/**
 * The packages as one table, when every departure carries the same ones at the
 * same prices, which is how the Telluride dates are sold. Listing the same
 * three columns twice would read as six choices. When they differ in anything,
 * this returns null and each departure gets its own table instead.
 */
function samePackages(trips: PublicTrip[]): PublicTrip["tiers"] | null {
  if (trips.length === 0) return null;
  const signature = (trip: PublicTrip) =>
    JSON.stringify(trip.tiers.map((t) => [t.name, t.price, t.description, t.inclusions]));
  return shared(trips, signature) !== null ? trips[0].tiers : null;
}

function toTierViews(tiers: PublicTrip["tiers"], perDeparture: boolean): TierView[] {
  return tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: formatPrice(tier.price),
    description: tier.description,
    inclusions: tier.inclusions,
    // One table standing for several departures cannot show one departure's
    // remaining spots; availability is on each departure above instead.
    spotsLeft: perDeparture ? tier.spotsLeft : null,
  }));
}

export default async function TelluridePage() {
  const trips = (await getPublishedTrips()).filter(isTelluride);
  const openTrips = trips.filter((trip) => trip.status !== "soldOut");

  const nights = shared(trips, (trip) => nightCount(trip.startDate, trip.endDate));
  const firstDay = shared(trips, (trip) => weekday(trip.startDate));
  const lastDay = shared(trips, (trip) => weekday(trip.endDate));
  const packages = TRIP_DETAILS_OPEN ? samePackages(trips) : null;

  return (
    <main className="scheme-light scheme-paint">
      {/* ---- masthead -------------------------------------------------------
          The photograph is the page. One flat scrim, no gradient, tuned by
          sampling this image: at 0.6, paper clears 4.8:1 against the brightest
          pixel anywhere in the middle band (the snowfields) and 6:1 in the
          lower third, where the small type sits, so the lede and the dates pass
          AA at any crop. Above the fold, so nothing here is wrapped in Reveal. */}
      <header className="scheme-espresso scheme-paint relative isolate flex min-h-[92svh] flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Plate image={HERO_IMAGE} fill mark={false} sizes="100vw" priority position="50% 45%" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(42_35_32_/_0.6)]" />

        <div className="shell flex flex-1 flex-col justify-end pb-10 pt-32 md:pb-14 md:pt-40">
          <p className="t-label text-[--text]">Telluride, Colorado · 8,725 ft</p>
          <h1 className="t-display mt-5 text-[--text]">Telluride</h1>

          <div className="mt-10 grid gap-10 border-t border-[--rule-strong] pt-8 md:mt-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-16">
            <div className="flex flex-col items-start gap-8">
              <p className="max-w-[46ch] font-body text-lede leading-[1.6] text-[--text]">
                {nights !== null ? `${spelled(nights)} nights` : "A week"} in a box
                canyon at the end of the road. One property for the whole group,
                lift tickets and rentals waiting, transfers from Montrose both
                ways, and Outrider staff there the entire trip.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button href="#departures" variant="primary" size="lg">
                  {BOOKINGS_OPEN ? "Choose your dates" : "See the dates"}
                </Button>
                <Button href="#included" variant="secondary" size="lg">
                  What&rsquo;s included
                </Button>
              </div>
            </div>

            {trips.length > 0 && (
              <ul className="m-0 flex list-none flex-col p-0 md:self-end">
                {trips.map((trip) => (
                  <li key={trip.id} className="border-b border-[--rule] last:border-0">
                    <a
                      href="#departures"
                      className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 no-underline"
                    >
                      <span className="font-display text-display-s font-medium tracking-title text-[--text] transition-colors duration-fast group-hover:text-[--accent]">
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </span>
                      <span className="t-micro text-[--text-secondary]">
                        {trip.status === "soldOut"
                          ? "Sold out"
                          : `${weekday(trip.startDate).slice(0, 3)} to ${weekday(trip.endDate).slice(0, 3)}`}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      {/* ---- why Telluride -------------------------------------------------- */}
      <section className="shell pt-20 md:pt-28" aria-labelledby="why-heading">
        <Reveal>
          <p className="t-rule-label text-[--text]">Why Telluride</p>
        </Reveal>
        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20">
          <Reveal>
            <h2 id="why-heading" className="t-title max-w-[14ch] text-[--text]">
              Hard to reach, which is the point
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-6">
              <p className="max-w-measure font-body text-lede leading-[1.7] text-[--text]">
                A box canyon in the San Juans with one road in and a wall of
                thirteen-thousand-foot peaks at the far end. The resorts an hour
                from Denver fill up with everyone who could not be bothered to
                go further. This one does not.
              </p>
              <p className="max-w-measure font-body text-body leading-[1.85] text-[--text-secondary]">
                The town is a few streets of brick and clapboard, walkable end to
                end in fifteen minutes and still a real town rather than a built
                resort base. Above it are two thousand acres, steep enough to
                hold up for people who can ski and gentle enough on the front
                side that people who cannot yet are not written off on day one.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Four figures on one hairline, not four boxes. */}
        <Reveal>
          <dl className="mt-16 grid grid-cols-2 border-t border-[--rule-strong] md:mt-20 lg:grid-cols-4">
            {TELLURIDE_FACTS.map((fact, i) => (
              <div
                key={fact.label}
                className={[
                  "flex flex-col gap-3 border-[--rule] py-7 pr-5 md:py-9",
                  // Vertical hairlines between columns only, never on the
                  // outer edge, at both the two- and four-column widths.
                  i % 2 === 1 ? "border-l pl-5" : "",
                  i === 2 ? "border-t lg:border-l lg:border-t-0 lg:pl-5" : "",
                  i === 3 ? "border-t lg:border-t-0" : "",
                ].join(" ")}
              >
                <dt className="t-micro order-2 text-[--accent]">{fact.label}</dt>
                <dd className="order-1 m-0 font-display text-display-s font-medium sm:text-display-m leading-none tracking-title text-[--text]">
                  {fact.value}
                </dd>
                <dd className="order-3 m-0 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                  {fact.note}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* ---- photographs -----------------------------------------------------
          Full-bleed to the right so the track runs off the screen, which is
          what tells you there is more to scroll. Same alignment as
          /destinations: 100% rather than 100vw, so it lines up with the shell. */}
      <section className="pb-20 pt-16 md:pb-28 md:pt-20" aria-label="Telluride in photographs">
        <div className="pl-[max(1.25rem,calc((100%-var(--shell))/2+var(--gutter)))] pr-gutter">
          <Reveal>
            <Gallery images={GALLERY} label="Telluride photographs" />
          </Reveal>
        </div>
      </section>

      {/* ---- the week --------------------------------------------------------
          Itinerary is trip detail, so it stays back before launch along with
          the packages. The days are derived from the dates rather than
          written out, so a departure of a different length cannot contradict
          the page. Numbered because it is a real sequence. */}
      {TRIP_DETAILS_OPEN && nights !== null && nights >= 2 && (
        <>
          <SectionDivider variant="rule" className="shell" />
          <section className="shell py-20 md:py-28" aria-labelledby="week-heading">
            <Reveal>
              <p className="t-rule-label text-[--text]">The week</p>
            </Reveal>
            <div className="mt-10 grid gap-12 md:mt-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20">
              <Reveal>
                <div className="flex flex-col gap-8 md:sticky md:top-32">
                  <h2 id="week-heading" className="t-title max-w-[14ch] text-[--text]">
                    {firstDay && lastDay ? `${firstDay} to ${lastDay}` : `${spelled(nights + 1)} days`}, arranged before you land
                  </h2>
                  <Plate
                    image={EVENING_IMAGE}
                    ratio="aspect-[4/3]"
                    sizes="(min-width: 768px) 40vw, 100vw"
                    position="30% 60%"
                  />
                </div>
              </Reveal>

              <ol className="m-0 flex list-none flex-col p-0">
                {weekPlan(nights, firstDay, lastDay).map((day, i) => (
                  <Reveal as="li" key={day.title} delay={i * 90} className="border-t border-[--rule-strong] py-8 first:pt-0 first:border-t-0 md:py-10">
                    <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
                      <p className="t-label pt-1.5 text-[--accent]">{day.when}</p>
                      <div className="flex flex-col gap-3">
                        <h3 className="t-subheading text-[--text]">{day.title}</h3>
                        <p className="max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]">
                          {day.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}

      {/* ---- the property ----------------------------------------------------
          The one espresso section in the body of the page. Held back until
          launch with the rest of the trip detail. */}
      {TRIP_DETAILS_OPEN && (
        <section className="scheme-espresso scheme-paint" aria-labelledby="property-heading">
          <div className="shell grid gap-12 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-20 md:py-28">
            <Reveal>
              <Plate
                image={PROPERTY_IMAGE}
                ratio="aspect-[4/5]"
                sizes="(min-width: 768px) 45vw, 100vw"
                position="55% 50%"
              />
            </Reveal>

            <Reveal delay={80}>
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-5">
                  <p className="t-rule-label text-[--text]">Where you stay</p>
                  <h2 id="property-heading" className="t-title text-[--text]">
                    {TELLURIDE_PROPERTY.name}
                  </h2>
                  <p className="t-micro text-[--accent]">{TELLURIDE_PROPERTY.where}</p>
                </div>
                {TELLURIDE_PROPERTY.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]"
                  >
                    {paragraph}
                  </p>
                ))}

                <div>
                  <h3 className="t-subheading text-[--text]">How the rooms work</h3>
                  <dl className="m-0 mt-5 flex flex-col">
                    {TELLURIDE_ROOMS.map((room) => (
                      <div
                        key={room.label}
                        className="grid gap-1.5 border-t border-[--rule] py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
                      >
                        <dt className="font-body text-body font-medium text-[--text]">{room.label}</dt>
                        <dd className="m-0 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                          {room.body}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- departures ------------------------------------------------------ */}
      {/* Before launch nothing espresso sits between the photographs and the
          dates, so a hairline marks the change of subject instead. */}
      {!TRIP_DETAILS_OPEN && <SectionDivider variant="rule" className="shell" />}
      <section
        id="departures"
        className="shell scroll-mt-24 py-20 md:scroll-mt-28 md:py-28"
        aria-labelledby="departures-heading"
      >
        <Reveal>
          <p className="t-rule-label text-[--text]">Departures</p>
          <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
            <h2 id="departures-heading" className="t-title max-w-[14ch] text-[--text]">
              {trips.length > 1 ? `${spelled(trips.length)} weeks, one trip` : "The dates"}
            </h2>
            <p className="t-lede">
              Every departure is the same trip: the same property, the same days
              on the mountain and the same events. Pick the week that works.
            </p>
          </div>
        </Reveal>

        {trips.length > 0 ? (
          <div className={cellGridClass(trips.length, "mt-12 md:mt-16")}>
            {trips.map((trip, i) => (
              <Departure key={trip.id} trip={trip} className={cellSpanClass(i, trips.length)} />
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-12 border border-[--rule] bg-[--surface-raised] p-8 md:p-12">
              <h3 className="t-subheading text-[--text]">Nothing open right now</h3>
              <p className="mt-4 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                The Telluride dates are not on the site at the moment. Write to{" "}
                <Link href="/contact" className={LINK}>
                  us
                </Link>{" "}
                with any questions in the meantime.
              </p>
            </div>
          </Reveal>
        )}

        {!BOOKINGS_OPEN && trips.length > 0 && (
          // Not COMING_SOON_NOTE: that promises packages and pricing "below",
          // and before launch this page does not show them.
          <p className="t-micro mt-6 text-[--text-muted]">
            Booking opens shortly. These dates are final.
          </p>
        )}
      </section>

      {/* ---- what's included, and the packages ---------------------------------
          id="included" is linked from the booking emails. Do not rename it,
          and keep it rendering in every launch state. scroll-mt clears the
          fixed nav when the page opens on the anchor.

          Warm gray, the page's one stone panel: it sets the price apart from
          the selling around it. TierTable's columns sit on --surface-raised,
          which is paper here, so every pair inside it is the same as on the
          trip page. On stone itself secondary text is #564E48 (5.4:1). */}
      <section
        id="included"
        className="scheme-stone scheme-paint scroll-mt-16 md:scroll-mt-20"
        aria-labelledby="included-heading"
      >
        <div className="shell py-20 md:py-28">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20">
            <Reveal>
              <div className="flex flex-col gap-6 md:sticky md:top-32">
                <p className="t-rule-label text-[--text]">Included</p>
                <h2 id="included-heading" className="t-title max-w-[12ch] text-[--text]">
                  What the price covers
                </h2>
                <p className="max-w-measure-tight font-body text-body leading-[1.75] text-[--text-secondary]">
                  One number per person, and this is what is inside it. No
                  resort fee at check in, no separate charge for the shuttle.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div>
                <h3 className="sr-only">In every package</h3>
                <ul className="m-0 flex list-none flex-col border-t border-[--rule-strong] p-0">
                  {SHARED_INCLUSIONS.map((item) => (
                    <li
                      key={item}
                      className="flex gap-5 border-b border-[--rule] py-5 font-body text-lede font-light leading-[1.45] text-[--text]"
                    >
                      {/* The same square TierTable uses for a line item. */}
                      <span aria-hidden="true" className="mt-[0.62em] h-1.5 w-1.5 shrink-0 bg-[--text]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  {NOT_INCLUDED_NOTE}{" "}
                  <Link href="/flights" className={LINK}>
                    Read the flight guide
                  </Link>
                  .
                </p>
              </div>
            </Reveal>
          </div>

          {/* ---- the packages compared ---- */}
          <div className="mt-20 md:mt-28">
            <Reveal>
              <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
                <h2 className="t-heading max-w-[16ch] text-[--text]">
                  {packages
                    ? packages.length === 1
                      ? "The package"
                      : `${spelled(packages.length)} ways to take the same trip`
                    : "The packages"}
                </h2>
                <p className="max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                  {TRIP_DETAILS_OPEN
                    ? "Everyone skis the same days and comes to the same events. What changes is where you sleep and how much is handled for you."
                    : "The packages, and what each one adds, go up with the pricing when booking opens."}
                </p>
              </div>
            </Reveal>

            {TRIP_DETAILS_OPEN &&
              (packages ? (
                <Reveal>
                  <TierTable
                    tiers={toTierViews(packages, false)}
                    // One table for every date, so Reserve goes to the booking
                    // page, which lists the open departures side by side.
                    bookHref={BOOKINGS_OPEN && openTrips.length > 0 ? "/bookings/new" : null}
                    className="mt-10 md:mt-12"
                  />
                  {trips.length > 1 && (
                    <p className="t-micro mt-5 text-[--text-secondary]">
                      Same packages and prices on every date.
                    </p>
                  )}
                </Reveal>
              ) : (
                trips.map((trip) => (
                  <Reveal key={trip.id} className="mt-10 md:mt-12">
                    <p className="t-rule-label text-[--text]">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </p>
                    <TierTable
                      tiers={toTierViews(trip.tiers, true)}
                      bookHref={
                        BOOKINGS_OPEN && trip.status !== "soldOut"
                          ? `/bookings/new?trip=${trip.id}`
                          : null
                      }
                      className="mt-6"
                    />
                  </Reveal>
                ))
              ))}
          </div>
        </div>
      </section>

      {/* ---- getting there --------------------------------------------------- */}
      <section className="shell py-20 md:py-28" aria-labelledby="getting-there-heading">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20">
          <Reveal>
            <h2 id="getting-there-heading" className="t-heading text-[--accent] md:sticky md:top-32">
              Getting there
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-8">
              {/* The route, set as type on a rule rather than drawn as a map:
                  the only facts that matter are the two ends and the gap. */}
              <div className="grid grid-cols-[auto_minmax(2rem,1fr)_auto] items-center gap-x-4 gap-y-2 sm:gap-x-6">
                <span className="font-display text-display-s font-medium tracking-title text-[--text]">MTJ</span>
                <span aria-hidden="true" className="h-px bg-[--rule-strong]" />
                <span className="font-display text-display-s font-medium tracking-title text-[--text]">Telluride</span>
                <span className="t-micro text-[--text-secondary]">Montrose</span>
                <span className="t-micro text-center text-[--text-secondary]">65 mi · 90 min by road</span>
                <span className="t-micro text-right text-[--text-secondary]">8,725 ft</span>
              </div>
              <p className="font-body text-body leading-[1.85] text-[--text]">
                Fly into Montrose, about 65 miles out and roughly an hour and a
                half by road. Ground transport from Montrose and back is arranged
                and included, so you are met at the airport and nobody sorts out
                a ride at either end.
              </p>
              <p className="font-body text-body leading-[1.85] text-[--text-secondary]">
                Flights are the one thing you book yourself. The flight guide
                covers which airport to pick, the arrival and departure windows
                for each set of dates, and what to do if the only routing you can
                find is a poor one.
              </p>
              <div>
                <Button href="/flights" variant="secondary">
                  Flight guide
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- short answers ---------------------------------------------------
          The questions people ask about this trip in particular, answered in
          a sentence or two, with the long versions a click away on /faq. No
          FAQ structured data here: /faq carries it, and two pages marking up
          the same questions compete with each other. */}
      <section className="shell py-20 md:py-28" aria-labelledby="answers-heading">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="answers-heading" className="t-heading text-[--text]">
              Short answers
            </h2>
            <Button href="/faq" variant="ghost">
              All questions
            </Button>
          </div>
        </Reveal>
        <dl className="m-0 mt-10 grid gap-x-16 md:mt-12 md:grid-cols-2">
          {ANSWERS.map((qa, i) => (
            <Reveal key={qa.q} delay={(i % 2) * 80} className="border-t border-[--rule-strong] py-7">
              <dt className="t-subheading text-[--text]">{qa.q}</dt>
              <dd className="m-0 mt-3 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                {qa.a}
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ---- close ------------------------------------------------------------
          Club blue as the single closing panel, as on the home page, handing
          into the espresso footer. Short copy only: see .scheme-club. Before
          launch the close is the waitlist instead, because there is nothing
          to reserve. */}
      {BOOKINGS_OPEN ? (
        <section className="scheme-club scheme-paint" aria-labelledby="close-heading">
          <div className="shell flex flex-col items-start gap-8 py-20 md:py-28">
            <Reveal>
              <h2 id="close-heading" className="t-title max-w-[16ch] text-[--text]">
                {openTrips.length > 0 ? "Pick your week" : "Both weeks are full"}
              </h2>
            </Reveal>
            <Reveal delay={90}>
              <p className="t-lede text-[--text-secondary]">
                {openTrips.length > 0
                  ? "A deposit holds your spot and the balance runs in scheduled installments, or pay the whole trip now. Each of you books your own."
                  : "Tell us you want in. When a spot comes back, or the next departure opens, you will hear first."}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex flex-wrap gap-4">
                {openTrips.length > 0 ? (
                  openTrips.map((trip) => (
                    <Button key={trip.id} href={`/bookings/new?trip=${trip.id}`} variant="primary" size="lg">
                      Reserve {formatDateRange(trip.startDate, trip.endDate)}
                    </Button>
                  ))
                ) : (
                  <Button href="/contact" variant="primary" size="lg">
                    Get in touch
                  </Button>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        <WaitlistCTA
          id="waitlist"
          placement="telluride"
          heading="Know when Telluride opens"
          body="Departures open to this list first. One email when booking opens, and nothing in between."
        />
      )}
    </main>
  );
}

/* -- the week ------------------------------------------------------------------ */

type Day = { when: string; title: string; body: string };

/**
 * Arrival day, the days on the mountain, and the day home. Only what every
 * package shares is said here (transfers, lift tickets, rentals, the private
 * events, the welcome package, staff), so nothing on this list can be true of
 * one package and not another.
 */
function weekPlan(nights: number, firstDay: string | null, lastDay: string | null): Day[] {
  const skiDays = nights - 1;
  const lastIndex = nights + 1;
  return [
    {
      when: firstDay ? `Day 1 · ${firstDay.slice(0, 3)}` : "Day 1",
      title: "Land in Montrose",
      body:
        "Somebody meets you at the airport and drives you up the canyon. You check in with your group, and the welcome package is waiting in the room.",
    },
    {
      when: skiDays === 1 ? "Day 2" : `Days 2–${skiDays + 1}`,
      title: `${spelled(skiDays)} ${skiDays === 1 ? "day" : "days"} on the mountain`,
      body:
        "Lift tickets and rentals are sorted before you arrive, so the first morning starts on the snow rather than in a line at the window. The private events on the itinerary run through the week.",
    },
    {
      when: lastDay ? `Day ${lastIndex} · ${lastDay.slice(0, 3)}` : `Day ${lastIndex}`,
      title: "Down to Montrose",
      body:
        "Check out, and the transfer takes the group back to the airport for flights home. Outrider staff are with you until then, as they are all week.",
    },
  ];
}

/* -- short answers ------------------------------------------------------------- */

/*
 * Each answer restates something the site already commits to (the FAQ, the
 * Terms, VALUE_PROPS, TELLURIDE_ROOMS) and adds no new promise. Money and
 * liability detail links to the Terms rather than quoting numbers that live
 * there.
 */
const ANSWERS: { q: string; a: React.ReactNode }[] = [
  {
    q: "I have never skied. Is that a problem?",
    a: "No. The front side is gentle enough that a first timer is not written off on day one, and lessons can be arranged. Tell us when you book so it is set up before you land.",
  },
  {
    q: "Can I room with my friends?",
    a: "Yes. Each of you books your own spot and shares a group code, and we room you together. Rooms are assigned in the order requests arrive, so send yours early.",
  },
  {
    q: "How big is the group?",
    a: "The number is set before a departure goes on sale and does not move. Rooms are shared by four or by two, and suites are booked whole for six or eight, so the people you live with all week stay a handful.",
  },
  {
    q: "How does paying work?",
    a: (
      <>
        A deposit holds your spot and the balance runs in scheduled
        installments, or you pay the whole trip when you book. Nobody fronts
        money for friends. The detail is in{" "}
        <Link href="/terms#payment-plan" className={LINK}>
          the Terms
        </Link>
        .
      </>
    ),
  },
  {
    q: "What is not included?",
    a: "Your flight to Montrose, meals other than those named in your package, and anything you buy on your own account. Everything else on this page is inside the price.",
  },
  {
    q: "Is somebody from Outrider actually there?",
    a: "Yes, on the ground in Telluride for the whole trip, not at the end of an email. The person who organized the group gets to ski.",
  },
];

/* -- one departure ----------------------------------------------------------- */

/**
 * One departure: the dates set large, the facts in a row, and the controls the
 * trip page would show, below a perforation, the way a ticket separates the
 * part you keep from the part you hand over.
 */
function Departure({ trip, className }: { trip: PublicTrip; className?: string }) {
  const nights = nightCount(trip.startDate, trip.endDate);
  const soldOut = trip.status === "soldOut";
  const dates = formatDateRange(trip.startDate, trip.endDate);
  // Same deep link the trip page builds, so a signed-out visitor comes back
  // from /login to this departure rather than to a generic booking start.
  const bookingHref = `/bookings/new?trip=${trip.id}`;

  return (
    <Reveal className={className}>
      <article className="flex h-full flex-col gap-8 bg-[--surface-raised] p-6 sm:p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="t-micro text-[--text-secondary]">{trip.name}</p>
          {/* Same rule as TripCard: before launch the badge says so, once. */}
          {BOOKINGS_OPEN ? (
            <StatusBadge status={trip.status} />
          ) : (
            <Badge tone="neutral">{COMING_SOON_LABEL}</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="t-heading text-[--text]">{dates}</h3>
          <p className="font-body text-body text-[--text-secondary]">
            {weekday(trip.startDate)} to {weekday(trip.endDate)}
          </p>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[--rule] pt-6">
          <div>
            <dt className="stamp-type text-[--text-muted]">Length</dt>
            <dd className="m-0 mt-2 font-body text-body text-[--text]">
              {nights} {nights === 1 ? "night" : "nights"}
            </dd>
          </div>
          <div>
            <dt className="stamp-type text-[--text-muted]">Fly into</dt>
            <dd className="m-0 mt-2 font-body text-body text-[--text]">Montrose (MTJ)</dd>
          </div>
          {/* No price while nothing can be bought, matching /trips. */}
          {BOOKINGS_OPEN && (
            <div>
              <dt className="stamp-type text-[--text-muted]">From</dt>
              <dd className="m-0 mt-2 font-body text-body text-[--text]">
                {formatPrice(trip.priceFrom)} <span className="text-[--text-secondary]">per person</span>
              </dd>
            </div>
          )}
          {BOOKINGS_OPEN && !soldOut && (
            <div>
              <dt className="stamp-type text-[--text-muted]">Availability</dt>
              <dd className="m-0 mt-2 font-body text-body text-[--text]">{availabilityLabel(trip.status)}</dd>
            </div>
          )}
        </dl>

        {/* The trip page 404s before launch, so it is only linked once it exists. */}
        {TRIP_DETAILS_OPEN && (
          <div className="mt-auto flex flex-col gap-6">
            <hr className="perforation" />
            <div className="flex flex-wrap items-center gap-4">
              {BOOKINGS_OPEN && !soldOut && (
                <Button href={bookingHref} variant="primary">
                  Reserve your spot
                </Button>
              )}
              <Button href={`/trips/${trip.id}`} variant="secondary">
                Trip details
              </Button>
            </div>
          </div>
        )}
      </article>
    </Reveal>
  );
}
