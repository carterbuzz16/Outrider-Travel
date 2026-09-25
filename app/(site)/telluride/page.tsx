import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Badge,
  Button,
  Gallery,
  Plate,
  Reveal,
  RoomPanel,
  RoomPhotos,
  StatusBadge,
  TAKEN_NOTE,
  Tabs,
  type TabItem,
  WaitlistButton,
  WaitlistCTA,
} from "@/components/ui";
import SectionNav, { type SectionLink } from "@/components/SectionNav";
import TripEvents from "@/components/TripEvents";
import { pageMetadata } from "@/lib/metadata";
import {
  BOOKINGS_OPEN,
  COMING_SOON_LABEL,
  COMING_SOON_NOTE,
  LIST_BOOKING_CTA,
  TRIP_DETAILS_OPEN,
} from "@/lib/booking-window";
import {
  NOT_INCLUDED_NOTE,
  SHARED_INCLUSIONS,
  TELLURIDE_EVENTS,
  TELLURIDE_FACTS,
  TELLURIDE_PROPERTY,
  TELLURIDE_TOWN,
  TRIP_SPONSORS,
} from "@/lib/site-content";
import {
  formatDateRange,
  formatPrice,
  getPublishedTrips,
  nightCount,
  tierAvailabilityLabel,
  type PublicTier,
  type PublicTrip,
} from "@/lib/trips";
import { getRoomMedia, isTaken, tierDisplayName, type RoomMedia } from "@/lib/room-media";
import { PAY_IN_FULL_DISCOUNT, computeDepositAmount } from "@/lib/deposit";
import { formatAmount } from "@/lib/balance";
import { flightTimesPublished } from "@/lib/trip-logistics";

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
 * Four sections under the masthead, each one screen or close to it, with a
 * sticky row of links to them (September 2026: the owner found the old page,
 * eleven sections and about nineteen screens, too long to find anything in).
 * Detail that used to stack is layered into tabs instead: the events and the
 * town share one section, and the hotel and each room share another, each
 * room tab carrying its own price, inclusions and dates. That also retired
 * the separate room showcase and package table, which showed the same four
 * packages twice.
 *
 *   Telluride     why the place, four figures, the photographs
 *   The week      the days, then tabs: private events, in town
 *   Rooms/prices  what every package includes, the dates, then tabs: the
 *                 hotel and one per package (#included, #departures)
 *   Good to know  getting there, and the questions, folded
 *
 * Launch gating follows app/(site)/trips/[id]/page.tsx exactly: before
 * TRIP_DETAILS_OPEN the departures are teased as dates and length only, with no
 * price, no packages, no itinerary and no property. The events and the town
 * show before launch: they are what the week feels like, not what it costs.
 * Nothing about a departure is hard-coded: dates, prices and package
 * inclusions all come from the published trips.
 */

export const metadata: Metadata = pageMetadata({
  title: "Telluride ski trip for college students",
  path: "/telluride",
  description:
    "Outrider's Telluride ski weeks for college groups this winter: the dates, the week, where you stay, what every package includes, and how to get there.",
});

// Same cadence as /trips, so publishing or editing a departure shows up here
// without a redeploy.
export const revalidate = 300;

const LINK = "text-[--accent] underline underline-offset-4";

/**
 * Scroll margin for anything the section links jump to: the fixed site nav
 * (h-16, md:h-20) plus the sticky section row under it (h-14).
 */
const SECTION_SCROLL = "scroll-mt-[7.5rem] md:scroll-mt-[8.5rem]";

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
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick Main Street and clock tower, a snow-covered peak rising straight up behind." },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines." },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind." },
  { src: "/images/telluride/gondola-night.jpg", alt: "A gondola cabin crossing a snowy ridge, the town far below in the valley." },
  { src: "/images/telluride/powder.jpg", alt: "Skiers on the sunny deck outside the old timber saloon at Gorrono Ranch, mid-mountain." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis and snowboards racked outside Gorrono Ranch, red chairs out on the snow and the San Juans behind." },
];

const TOWN_IMAGE = {
  src: "/images/telluride/town-christmas.jpg",
  alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind.",
};

const PROPERTY_IMAGE = {
  src: "/images/peaks/peaks-exterior-night.jpg",
  alt: "The Peaks Resort from above on a winter night, its windows lit and the heated outdoor pool glowing, with snowy peaks behind.",
};

/**
 * The smallest deposit on offer across these departures: 10% of the cheapest
 * package (computeDepositAmount), in dollars, so the close says "$160" rather
 * than a percentage someone has to work out.
 */
function depositFrom(trips: PublicTrip[]): string {
  const cheapest = Math.min(...trips.map((trip) => trip.priceFrom).filter((p) => p > 0));
  return Number.isFinite(cheapest) ? formatAmount(computeDepositAmount(cheapest)) : "a 10% deposit";
}

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

/* -- the packages, across departures ------------------------------------------ */

/**
 * One package as the reader chooses it: a kind of room, whichever dates it is
 * on. The departures carry the same packages, except where one lacks a room
 * (January has no Penthouse 830), so they are merged by name, and each
 * package lists the dates it is actually on. Prices can differ by date
 * (January is dearer, from September 2026), so when they do, the panel leads
 * with "From" and each date's row carries its own price.
 */
type PackageOption = {
  key: string;
  label: string;
  room: RoomMedia | null;
  inclusions: string[];
  description: string | null;
  offers: { trip: PublicTrip; tier: PublicTier }[];
};

/** "Penthouse  702 " and "PENTHOUSE 702" are the same package. */
function packageKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

function packageOptions(trips: PublicTrip[]): PackageOption[] {
  const byKey = new Map<string, PackageOption>();
  for (const trip of trips) {
    for (const tier of trip.tiers) {
      const key = packageKey(tier.name);
      const existing = byKey.get(key);
      if (existing) {
        existing.offers.push({ trip, tier });
      } else {
        byKey.set(key, {
          key,
          label: tierDisplayName(tier.name),
          room: getRoomMedia(tier.name),
          inclusions: tier.inclusions,
          description: tier.description,
          offers: [{ trip, tier }],
        });
      }
    }
  }
  const lowest = (option: PackageOption) => Math.min(...option.offers.map((o) => o.tier.price));
  return [...byKey.values()].sort((a, b) => lowest(a) - lowest(b) || a.label.localeCompare(b.label));
}

/** Whether this package costs the same on every date it is on. */
function onePrice(option: PackageOption): boolean {
  return new Set(option.offers.map((o) => o.tier.price)).size === 1;
}

/** One price when every date agrees; "From" the lowest when they don't. */
function packagePrice(option: PackageOption): string {
  const low = formatPrice(Math.min(...option.offers.map((o) => o.tier.price)));
  return onePrice(option) ? low : `From ${low}`;
}

export default async function TelluridePage() {
  const trips = (await getPublishedTrips()).filter(isTelluride);
  const openTrips = trips.filter((trip) => trip.status !== "soldOut");

  const nights = shared(trips, (trip) => nightCount(trip.startDate, trip.endDate));
  const firstDay = shared(trips, (trip) => weekday(trip.startDate));
  const lastDay = shared(trips, (trip) => weekday(trip.endDate));
  const packages = TRIP_DETAILS_OPEN ? packageOptions(trips) : [];

  const sections: SectionLink[] = [
    { href: "#overview", label: "Telluride" },
    { href: "#events", label: "The week" },
    { href: "#included", label: TRIP_DETAILS_OPEN ? "Rooms and prices" : "What's included" },
    { href: "#details", label: "Good to know" },
  ];

  const roomTabs: TabItem[] = packages.length
    ? [
        { id: "hotel", label: "The hotel", content: <HotelPanel /> },
        ...packages.map((option) => ({
          id: option.key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: option.label,
          content: <PackagePanel option={option} tripCount={trips.length} />,
        })),
      ]
    : [];

  return (
    <main className="scheme-light scheme-paint">
      {/* ---- masthead -------------------------------------------------------
          The photograph is the page. One flat scrim, no gradient, tuned by
          sampling this image: at 0.6, paper clears 4.8:1 against the brightest
          pixel anywhere in the middle band (the snowfields) and 6:1 in the
          lower third, where the small type sits, so the lede and the dates pass
          AA at any crop. Above the fold, so nothing here is wrapped in Reveal. */}
      <header className="scheme-espresso scheme-paint relative isolate flex min-h-[88svh] flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Plate image={HERO_IMAGE} fill mark={false} sizes="100vw" priority position="50% 45%" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(42_35_32_/_0.6)]" />

        <div className="shell flex flex-1 flex-col justify-end pb-10 pt-32 md:pb-14 md:pt-40">
          <p className="t-label text-[--text]">Telluride, Colorado at 8,725 ft</p>
          <h1 className="t-display mt-5 text-[--text]">Telluride</h1>

          <div className="mt-10 grid gap-10 border-t border-[--rule-strong] pt-8 md:mt-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-16">
            <div className="flex flex-col items-start gap-8">
              <p className="max-w-[46ch] font-body text-lede leading-[1.6] text-[--text]">
                {nights !== null ? `${spelled(nights)} nights` : "A week"} with your
                friends in a box canyon at the end of the road. One hotel for
                the whole group, lift tickets and rentals waiting, private
                events every day of the week, and our team there the whole
                trip.
              </p>
              <div className="flex flex-wrap gap-4">
                {/* Straight to the booking page once there is something to
                    book: it asks for the dates, then the package. "Choose
                    your dates" used to scroll down the page to a second,
                    smaller Reserve button. */}
                {BOOKINGS_OPEN && openTrips.length > 0 ? (
                  <Button href="/bookings/new" variant="primary" size="lg">
                    Reserve your spot
                  </Button>
                ) : TRIP_DETAILS_OPEN ? (
                  // Paying is list-only: the emailed link is the way in.
                  <WaitlistButton label={LIST_BOOKING_CTA} variant="primary" size="lg" placement="telluride-hero" />
                ) : (
                  <Button href="#departures" variant="primary" size="lg">
                    See the dates
                  </Button>
                )}
                <Button href="#included" variant="secondary" size="lg">
                  What&rsquo;s included
                </Button>
              </div>
            </div>

            {trips.length > 0 && (
              <ul className="m-0 flex list-none flex-col p-0 md:self-end">
                {trips.map((trip) => {
                  // Each date books itself once booking is open: one click from
                  // the top of the page to that departure's packages.
                  const bookable = BOOKINGS_OPEN && trip.status !== "soldOut";
                  return (
                    <li key={trip.id} className="border-b border-[--rule] last:border-0">
                      <a
                        href={bookable ? `/bookings/new?trip=${trip.id}` : "#departures"}
                        className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 no-underline"
                      >
                        <span className="font-display text-display-s font-medium tracking-title text-[--text] transition-colors duration-fast group-hover:text-[--accent]">
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                        <span className="t-micro text-[--text-secondary] transition-colors duration-fast group-hover:text-[--accent]">
                          {trip.status === "soldOut"
                            ? "Sold out"
                            : bookable
                              ? "Reserve \u2192"
                              : `${weekday(trip.startDate).slice(0, 3)} to ${weekday(trip.endDate).slice(0, 3)}`}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </header>

      <SectionNav links={sections} />

      {/* ---- Telluride ------------------------------------------------------
          The place in one paragraph and four figures, then the photographs,
          which run off the right edge so the track reads as scrollable. */}
      <section id="overview" className={`${SECTION_SCROLL} pb-16 pt-16 md:pb-24 md:pt-24`} aria-labelledby="why-heading">
        <div className="shell">
          <Reveal>
            <p className="t-rule-label text-[--text]">Why Telluride</p>
          </Reveal>
          <div className="mt-10 grid gap-8 md:mt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
            <Reveal>
              <h2 id="why-heading" className="t-title max-w-[14ch] text-[--text]">
                One road in, 13,000-foot walls
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="max-w-measure font-body text-lede leading-[1.65] text-[--text]">
                A box canyon in the San Juans, closed off by peaks that clear
                13,000 feet. An old mining town with a real Main Street at the
                bottom, two thousand acres of mountain above it, and a free
                gondola between the two.
              </p>
            </Reveal>
          </div>

          {/* Four figures on one hairline, not four boxes. */}
          <Reveal>
            <dl className="m-0 mt-12 grid grid-cols-2 border-t border-[--rule-strong] md:mt-16 lg:grid-cols-4">
              {TELLURIDE_FACTS.map((fact, i) => (
                <div
                  key={fact.label}
                  className={[
                    "flex flex-col gap-2 border-[--rule] py-6 pr-5 md:py-8",
                    // Vertical hairlines between columns only, never on the
                    // outer edge, at both the two- and four-column widths.
                    i % 2 === 1 ? "border-l pl-5" : "",
                    i === 2 ? "border-t lg:border-l lg:border-t-0 lg:pl-5" : "",
                    i === 3 ? "border-t lg:border-t-0" : "",
                  ].join(" ")}
                >
                  <dt className="t-micro order-2 text-[--accent]">{fact.label}</dt>
                  <dd className="order-1 m-0 font-display text-display-s font-medium leading-none tracking-title text-[--text] sm:text-display-m">
                    {fact.value}
                  </dd>
                  <dd className="order-3 m-0 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                    {fact.note}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="mt-6 pl-[max(1.25rem,calc((100%-var(--shell))/2+var(--gutter)))] pr-gutter md:mt-10">
          <Reveal>
            <Gallery images={GALLERY} label="Telluride photographs" />
          </Reveal>
        </div>
      </section>

      {/* ---- the week ---------------------------------------------------------
          Espresso. The days as one row of three (itinerary is trip detail, so
          it waits for launch), then the events and the town as tabs. id="events"
          is what the home page's "See the week" links to. */}
      <section
        id="events"
        className={`scheme-espresso scheme-paint ${SECTION_SCROLL}`}
        aria-labelledby="events-heading"
      >
        <div className="shell py-16 md:py-24">
          <Reveal>
            <p className="t-rule-label text-[--text]">The week</p>
            <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
              <h2 id="events-heading" className="t-title max-w-[14ch] text-[--text]">
                The week has a guest list
              </h2>
              <p className="t-lede max-w-measure text-[--text-secondary]">
                Every package comes with the same nights out. They&rsquo;re
                booked, hosted and closed to anyone who isn&rsquo;t on the trip.
              </p>
            </div>
          </Reveal>

          {TRIP_DETAILS_OPEN && nights !== null && nights >= 2 && (
            <Reveal>
              <ol className="m-0 mt-12 grid list-none gap-8 border-t border-[--rule-strong] p-0 pt-8 md:mt-14 md:grid-cols-3 md:gap-10">
                {weekPlan(nights, firstDay, lastDay).map((day) => (
                  <li key={day.title} className="flex flex-col gap-2">
                    <p className="t-micro text-[--accent]">{day.when}</p>
                    <h3 className="t-subheading text-[--text]">{day.title}</h3>
                    <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                      {day.body}
                    </p>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}

          <Tabs
            label="The week"
            className="mt-14 md:mt-16"
            tabs={[
              { id: "events", label: "Private events", content: <TripEvents events={TELLURIDE_EVENTS} /> },
              { id: "town", label: "In town", content: <TownPanel /> },
            ]}
          />

          {/* Sponsors, by their own logo. Outbound and commercial, so
              rel="sponsored". The alt is the brand name, which is what the
              logo says. */}
          {TRIP_SPONSORS.length > 0 && (
            <dl className="m-0 mt-14 flex flex-col border-t border-[--rule] md:mt-16">
              {TRIP_SPONSORS.map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-[--rule] py-5"
                >
                  <dt className="flex items-center gap-5">
                    <span className="t-micro text-[--text-secondary]">On the trip</span>
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      // On a paper tile: the logo's red is under 3:1 on
                      // espresso and reads as a smudge, and a logo is never
                      // recolored to fix that.
                      className="scheme-light scheme-paint block px-4 py-3 transition-opacity duration-fast hover:opacity-85"
                    >
                      <Image
                        src={sponsor.logo.src}
                        alt={sponsor.name}
                        width={sponsor.logo.width}
                        height={sponsor.logo.height}
                        className="h-8 w-auto md:h-10"
                      />
                    </a>
                  </dt>
                  <dd className="m-0 font-body text-body text-[--text-secondary]">{sponsor.supplies}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* ---- rooms and prices -----------------------------------------------
          id="included" is linked from the booking emails. Do not rename it,
          and keep it rendering in every launch state.

          Warm gray, the page's one stone panel: it sets the price apart from
          the selling around it. On stone, secondary text is #564E48 (5.4:1).
          What every package includes and the dates sit side by side; under
          them, one tab for the hotel and one per package. */}
      <section
        id="included"
        className={`scheme-stone scheme-paint ${SECTION_SCROLL}`}
        aria-labelledby="included-heading"
      >
        <div className="shell py-16 md:py-24">
          <Reveal>
            <p className="t-rule-label text-[--text]">
              {TRIP_DETAILS_OPEN ? "Rooms and prices" : "Included"}
            </p>
            <h2 id="included-heading" className="t-title mt-10 max-w-[16ch] text-[--text] md:mt-12">
              What&rsquo;s waiting for you
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-12 md:mt-12 md:grid-cols-2 md:gap-20">
            <Reveal>
              <h3 className="t-micro text-[--text-secondary]">In every package</h3>
              <ul className="m-0 mt-4 flex list-none flex-col border-t border-[--rule-strong] p-0">
                {SHARED_INCLUSIONS.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 border-b border-[--rule] py-3.5 font-body text-body leading-[1.5] text-[--text]"
                  >
                    {/* The same square TierTable uses for a line item. */}
                    <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-[--text]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                {NOT_INCLUDED_NOTE}{" "}
                <Link href="/flights" className={LINK}>
                  Read the flight guide
                </Link>
                .
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div id="departures" className={SECTION_SCROLL}>
                <h3 className="t-micro text-[--text-secondary]">The dates</h3>
                {trips.length > 0 ? (
                  <ul className="m-0 mt-4 flex list-none flex-col border-t border-[--rule-strong] p-0">
                    {trips.map((trip) => (
                      <DateRow key={trip.id} trip={trip} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 max-w-measure border-t border-[--rule-strong] pt-5 font-body text-body leading-[1.75] text-[--text-secondary]">
                    The Telluride dates aren&rsquo;t on the site right now. Write to{" "}
                    <Link href="/contact" className={LINK}>
                      us
                    </Link>{" "}
                    with any questions in the meantime.
                  </p>
                )}
                <p className="t-micro mt-5 text-[--text-secondary]">
                  {BOOKINGS_OPEN
                    ? "Same trip, same hotel, same days on the mountain. Pick the week that works for your crew."
                    : TRIP_DETAILS_OPEN
                      ? COMING_SOON_NOTE
                      : "Booking opens shortly. These dates are final."}
                </p>
                {!BOOKINGS_OPEN && TRIP_DETAILS_OPEN && (
                  <div className="mt-6">
                    <WaitlistButton label={LIST_BOOKING_CTA} variant="primary" size="md" placement="telluride-dates" />
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          {roomTabs.length > 0 ? (
            <Reveal>
              <div className="mt-16 md:mt-20">
                <h3 className="t-heading text-[--text]">Where you stay</h3>
                <Tabs label="Where you stay" tabs={roomTabs} className="mt-8" />
              </div>
            </Reveal>
          ) : (
            !TRIP_DETAILS_OPEN && (
              <p className="mt-12 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                The rooms, the packages and what each one adds go up with the
                pricing when booking opens.
              </p>
            )
          )}
        </div>
      </section>

      {/* ---- good to know -----------------------------------------------------
          Getting there on the left, the questions folded on the right. Native
          <details>, so they open without JavaScript. No FAQ structured data
          here: /faq carries it, and two pages marking up the same questions
          compete with each other. */}
      <section id="details" className={`shell ${SECTION_SCROLL} py-16 md:py-24`} aria-label="Good to know">
        <Reveal>
          <p className="t-rule-label text-[--text]">Good to know</p>
        </Reveal>
        <div className="mt-10 grid gap-14 md:mt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20">
          <Reveal>
            <div className="flex flex-col gap-7">
              <h2 className="t-heading text-[--text]">Getting there</h2>
              {/* The route, set as type on a rule rather than drawn as a map:
                  the only facts that matter are the two ends and the gap. */}
              <div className="grid grid-cols-[auto_minmax(2rem,1fr)_auto] items-center gap-x-4 gap-y-2 sm:gap-x-6">
                <span className="font-display text-display-s font-medium tracking-title text-[--text]">MTJ</span>
                <span aria-hidden="true" className="h-px bg-[--rule-strong]" />
                <span className="font-display text-display-s font-medium tracking-title text-[--text]">Telluride</span>
                <span className="t-micro text-[--text-secondary]">Montrose</span>
                <span className="t-micro text-center text-[--text-secondary]">65 mi, 90 min</span>
                <span className="t-micro text-right text-[--text-secondary]">8,725 ft</span>
              </div>
              <p className="max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]">
                Fly into Montrose. We meet you at the airport, drive you up the
                canyon and bring you back at the end. Flights are the one thing
                you book yourself, and the flight guide covers which airport to
                pick
                {flightTimesPublished()
                  ? " and the arrival and departure windows for each set of dates."
                  : ". We'll post the arrival and departure windows for each set of dates there."}
              </p>
              <div>
                <Button href="/flights" variant="secondary">
                  Flight guide
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <h2 className="t-heading text-[--text]">Quick questions</h2>
                <Button href="/faq" variant="ghost">
                  All questions
                </Button>
              </div>
              <div className="mt-6 border-b border-[--rule]">
                {ANSWERS.map((qa) => (
                  <details key={qa.q} className="group border-t border-[--rule]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-body text-body font-medium text-[--text] [&::-webkit-details-marker]:hidden">
                      {qa.q}
                      {/* A hairline plus that loses its upright when open. */}
                      <span aria-hidden="true" className="relative h-3 w-3 shrink-0 text-[--text-secondary]">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-fast group-open:scale-y-0" />
                      </span>
                    </summary>
                    <div className="max-w-measure pb-6 font-body text-body leading-[1.75] text-[--text-secondary]">
                      {qa.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
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
                {openTrips.length > 0
                  ? "Pick your week"
                  : trips.length === 0
                    ? "New dates coming soon"
                    : trips.length === 1
                      ? "This week is full"
                      : trips.length === 2
                        ? "Both weeks are full"
                        : "Every week is full"}
              </h2>
            </Reveal>
            <Reveal delay={90}>
              <p className="t-lede text-[--text-secondary]">
                {openTrips.length > 0
                  ? `Hold your spot for ${depositFrom(openTrips)} and pay the rest in two installments${
                      PAY_IN_FULL_DISCOUNT > 0 ? `, or pay it all now and take $${PAY_IN_FULL_DISCOUNT} off` : ""
                    }. Each of you books your own.`
                  : "Tell us you want in. If a spot opens up or the next trip goes live, you'll hear first."}
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
          heading={TRIP_DETAILS_OPEN ? LIST_BOOKING_CTA : "First dibs on Telluride"}
          body={
            TRIP_DETAILS_OPEN
              ? COMING_SOON_NOTE
              : "Booking opens to the list before anyone else. Join and you'll hear first."
          }
        />
      )}
    </main>
  );
}

/* -- the week ------------------------------------------------------------------ */

type Day = { when: string; title: string; body: string };

function weekPlan(nights: number, firstDay: string | null, lastDay: string | null): Day[] {
  const skiDays = nights - 1;
  const lastIndex = nights + 1;
  return [
    {
      when: firstDay ? `Day 1, ${firstDay.slice(0, 3)}` : "Day 1",
      title: "Touch down in Montrose",
      body: "We meet you at the airport and drive you up the canyon. Your welcome package is waiting in the room.",
    },
    {
      when: skiDays === 1 ? "Day 2" : `Days 2–${skiDays + 1}`,
      title: `${spelled(skiDays)} ${skiDays === 1 ? "day" : "days"} on the mountain`,
      body: "Lift tickets and rentals ready before you land, private events every day, and the free gondola down to Main Street every night.",
    },
    {
      when: lastDay ? `Day ${lastIndex}, ${lastDay.slice(0, 3)}` : `Day ${lastIndex}`,
      title: "Back down to Montrose",
      body: "We ride back to the airport together for flights home. Our team is with you until then.",
    },
  ];
}

/** The town after the lifts: the "In town" tab. Public facts only, see TELLURIDE_TOWN. */
function TownPanel() {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
      <div className="flex flex-col gap-6">
        <h3 className="t-heading max-w-[14ch] text-[--text]">One gondola ride to Main Street</h3>
        <Plate image={TOWN_IMAGE} ratio="aspect-[4/3]" sizes="(min-width: 768px) 35vw, 100vw" />
      </div>
      <dl className="m-0 grid gap-x-10 sm:grid-cols-2">
        {TELLURIDE_TOWN.map((place) => (
          <div key={place.name} className="flex flex-col gap-1.5 border-t border-[--rule] py-5">
            <dt className="font-body text-body font-medium text-[--text]">{place.name}</dt>
            <dd className="m-0 font-body text-body-s leading-[1.65] text-[--text-secondary]">{place.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -- rooms and prices ------------------------------------------------------------ */

/** The first tab under "Where you stay": the property every package shares. */
function HotelPanel() {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:gap-16">
      <Plate
        image={PROPERTY_IMAGE}
        // The photograph is wide (16:9), so a wide frame keeps the building,
        // the pool and the peaks all in it.
        ratio="aspect-[3/2]"
        sizes="(min-width: 768px) 50vw, 100vw"
        position="55% 55%"
      />
      <div className="flex flex-col gap-5">
        <p className="t-micro text-[--text-secondary]">{TELLURIDE_PROPERTY.where}</p>
        <h4 className="t-heading text-[--text]">{TELLURIDE_PROPERTY.name}</h4>
        {TELLURIDE_PROPERTY.body.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]">
            {paragraph}
          </p>
        ))}
        <p className="max-w-measure font-body text-body leading-[1.8] text-[--text]">
          Every package stays here. What changes is the room, and how many of
          you share it: each tab is one.
        </p>
      </div>
    </div>
  );
}

/**
 * One package: the room's photographs on the left; on the right its price,
 * what the room is, what the package includes, and every date it is on with
 * that date's availability and a Reserve that arrives with the package
 * already chosen.
 */
function PackagePanel({ option, tripCount }: { option: PackageOption; tripCount: number }) {
  const { room } = option;
  const missing = option.offers.length < tripCount;
  const anyTaken = option.offers.some(({ tier }) => tier.claimed || isTaken(tier.name, tier.spotsLeft));

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-16">
      {/* Pinned under the two navs while a long penthouse list scrolls past,
          so the column is never empty. */}
      <div className="md:sticky md:top-40 md:self-start">
        {room && room.photos.length > 0 ? (
          <RoomPhotos photos={room.photos} title={room.title} sizes="(min-width: 768px) 50vw, 100vw" />
        ) : room ? (
          <RoomPanel room={room} />
        ) : null}
      </div>

      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <h4 className="t-micro text-[--text-secondary]">{option.label}</h4>
          {TRIP_DETAILS_OPEN && (
            <p className="m-0 flex items-baseline gap-3">
              <span className="font-display text-display-m font-medium leading-none tracking-title text-[--text]">
                {packagePrice(option)}
              </span>
              <span className="font-body text-body-s text-[--text-secondary]">per person</span>
            </p>
          )}
          {(room?.upgrade ?? option.description) && (
            <p className="max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
              {room?.upgrade ?? option.description}
            </p>
          )}
        </div>

        {option.inclusions.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {option.inclusions.map((item) => (
              <li key={item} className="flex gap-3.5 font-body text-body-s leading-[1.55] text-[--text]">
                <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 bg-[--text]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div>
          <ul className="m-0 flex list-none flex-col border-t border-[--rule-strong] p-0">
            {option.offers.map(({ trip, tier }) => (
              <OfferRow key={tier.id} trip={trip} tier={tier} showPrice={TRIP_DETAILS_OPEN && !onePrice(option)} />
            ))}
          </ul>
          {missing && (
            <p className="t-micro mt-4 text-[--text-secondary]">
              Only on the {option.offers.length === 1 ? "date" : "dates"} above.
            </p>
          )}
          {anyTaken && (
            <p className="mt-4 max-w-measure font-body text-body-s leading-[1.6] text-[--text-secondary]">
              {TAKEN_NOTE}
            </p>
          )}
          {!BOOKINGS_OPEN && (
            // No Reserve while paying is list-only; this is the way in.
            <div className="mt-6">
              <WaitlistButton label={LIST_BOOKING_CTA} variant="primary" size="md" placement="telluride-rooms" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One date a package is on: the dates, its price when dates differ, how it stands, and Reserve. */
function OfferRow({ trip, tier, showPrice }: { trip: PublicTrip; tier: PublicTier; showPrice: boolean }) {
  const taken = tier.claimed || isTaken(tier.name, tier.spotsLeft);
  const full = taken || (tier.spotsLeft !== null && tier.spotsLeft <= 0) || trip.status === "soldOut";
  const status = tierAvailabilityLabel(tier.spotsLeft, taken) ?? (full ? "Sold out" : null);
  // Tier id rather than name: the booking page matches either, and the id
  // cannot be mistyped or renamed out from under the link.
  const href = `/bookings/new?trip=${trip.id}&package=${tier.id}`;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[--rule] py-3.5">
      <span className="flex flex-col">
        <span className="font-body text-body text-[--text]">{formatDateRange(trip.startDate, trip.endDate)}</span>
        {showPrice && (
          <span className="font-body text-body-s tabular-nums text-[--text-secondary]">
            {formatPrice(tier.price)} per person
          </span>
        )}
      </span>
      <span className="flex items-center gap-4">
        {status && <span className="t-micro text-[--text-secondary]">{status}</span>}
        {BOOKINGS_OPEN && !full && (
          <Button href={href} variant="primary" size="md">
            Reserve
          </Button>
        )}
      </span>
    </li>
  );
}

/** One departure in "The dates": set large, with its status and Reserve. */
function DateRow({ trip }: { trip: PublicTrip }) {
  const nights = nightCount(trip.startDate, trip.endDate);
  const soldOut = trip.status === "soldOut";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-[--rule] py-5">
      <div className="flex flex-col gap-1.5">
        <span className="font-display text-display-s font-medium tracking-title text-[--text]">
          {formatDateRange(trip.startDate, trip.endDate)}
        </span>
        <span className="t-micro text-[--text-secondary]">
          {weekday(trip.startDate)} to {weekday(trip.endDate)}, {nights} {nights === 1 ? "night" : "nights"}
          {TRIP_DETAILS_OPEN && `, from ${formatPrice(trip.priceFrom)}`}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {/* Same rule as TripCard: before launch the badge says so, once. */}
        {BOOKINGS_OPEN ? <StatusBadge status={trip.status} /> : <Badge tone="neutral">{COMING_SOON_LABEL}</Badge>}
        {BOOKINGS_OPEN && !soldOut && (
          // Same deep link the trip page builds, so a signed-out visitor
          // comes back from /login to this departure.
          <Button href={`/bookings/new?trip=${trip.id}`} variant="primary" size="md">
            Reserve these dates
          </Button>
        )}
      </div>
    </li>
  );
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
    q: "I've never skied. Is that a problem?",
    a: "Not at all. The front side is gentle enough for a great first day. Lessons are available at the resort's rate: tell us when you book and we'll set one up before you land.",
  },
  {
    q: "Can I room with my friends?",
    a: "Yes. Each of you books your own spot with a shared group code, and we room you together. Rooms are assigned in the order requests come in, so send yours early.",
  },
  {
    q: "How big is the group?",
    a: "Up to 100 in December and 50 in January, set before the trip goes on sale. Rooms are shared by four or by two, and a penthouse holds eight.",
  },
  {
    q: "How does paying work?",
    a: (
      <>
        Put down 10% to hold your spot and pay the rest in two installments
        {PAY_IN_FULL_DISCOUNT > 0 && `, or pay it all now and take $${PAY_IN_FULL_DISCOUNT} off`}. Each
        of you books your own, so nobody fronts money for friends. The detail is in{" "}
        <Link href="/terms#payment-plan" className={LINK}>
          the Terms
        </Link>
        .
      </>
    ),
  },
  {
    q: "What is not included?",
    a: "Your flight to Montrose, meals other than those named in your package, and anything you buy on your own account. Travel insurance isn't included. We'll offer it as an optional add-on. Everything else on this page is inside the price.",
  },
  {
    q: "Is somebody from Outrider actually there?",
    // No texting number is published yet (CONTACT.phone and SMS_NUMBER are
    // unset), so this promises email, not texts.
    a: "Yes. Our team is with you from pickup to drop-off, an email away and on the ground all week.",
  },
];
