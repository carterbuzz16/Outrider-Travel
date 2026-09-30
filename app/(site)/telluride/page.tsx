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
  RoomPhotosButton,
  StatusBadge,
  TAKEN_NOTE,
  Tabs,
  WaitlistButton,
  WaitlistCTA,
} from "@/components/ui";
import SectionNav, { type SectionLink } from "@/components/SectionNav";
import TripEvents from "@/components/TripEvents";
import { CreditLine, WelcomeCreditProvider } from "@/components/WelcomeCredit";
import MobileReserveBar from "@/app/(site)/trips/[id]/MobileReserveBar";
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
  TELLURIDE_AT_A_GLANCE,
  TELLURIDE_EVENTS,
  TELLURIDE_FACTS,
  TELLURIDE_TOWN,
  TRIP_SPONSORS,
  TRIP_WHAT_YOU_GET,
} from "@/lib/site-content";
import {
  formatDateRange,
  formatPrice,
  getPublishedTrips,
  isTellurideDestination,
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
 * /telluride: both Telluride departures on one page, and the page Instagram
 * ads land on.
 *
 * This is also the landing page the booking emails link to, as
 * https://outrider.travel/telluride and https://outrider.travel/telluride#included.
 * Both URLs are in mail that has already been sent, so the route and the
 * `included` anchor must not be renamed or removed. The anchor renders before
 * launch as well, with whatever inclusion detail is public at that point.
 *
 * Rebuilt for a phone on 29 September 2026. Carter found the old masthead (a
 * darkened photograph, one paragraph, two buttons) dull, and the rooms hard to
 * find behind tabs: someone arriving from an ad should see what they get in
 * the first screen, then be one tap from paying. So, in page order:
 *
 *   masthead      the photograph as it is (no scrim over it), then the trip in
 *                 five lines, the dates, the price from, and Reserve
 *   What you get  four of the inclusions as photographs, then the rest as a
 *                 list (#included)
 *   Rooms         one card per package, swiped sideways on a phone: its room,
 *                 its price on each date, and a Reserve that arrives with the
 *                 package chosen; then the dates (#rooms, #departures)
 *   The week      the days, then tabs: private events, in town (#events)
 *   Telluride     four figures and the photographs (#overview)
 *   Good to know  getting there, and the questions, folded (#details)
 *
 * The new-account credit (lib/welcome-credit.ts) lives here too: the pop-up,
 * the line under Reserve, and the countdown on the phone Reserve bar all come
 * from WelcomeCreditProvider, which asks for the visitor's state after the
 * page loads, so the page itself stays static.
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
 *
 * The masthead is the bright one: the gondola, the town and a skier in one
 * frame, which says "ski trip to Telluride" before a word is read. It is shown
 * as it is. The old masthead sat under a 60% scrim so type could go over it,
 * which is what made it read as dull; the type now sits below the picture.
 */
const HERO_IMAGE = {
  src: "/images/telluride/skiing.jpg",
  alt: "A skier carving a groomed run high above the town of Telluride, a gondola cabin passing overhead and the San Juans behind.",
};

// The photographs the masthead and "What you get" use are not repeated here.
const GALLERY = [
  { src: "/images/telluride/alpenglow.jpg", alt: "Pink alpenglow over the snow-covered San Juan peaks, with ski runs cut through dark forest below." },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines." },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind." },
  { src: "/images/telluride/gondola-night.jpg", alt: "A gondola cabin crossing a snowy ridge, the town far below in the valley." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis and snowboards racked outside Gorrono Ranch, red chairs out on the snow and the San Juans behind." },
];

const TOWN_IMAGE = {
  src: "/images/telluride/town-christmas.jpg",
  alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind.",
};

/**
 * The smallest deposit on offer across these departures: 10% of the cheapest
 * package (computeDepositAmount), in dollars, so the page says "$160" rather
 * than a percentage someone has to work out.
 */
function depositFrom(trips: PublicTrip[]): string {
  const cheapest = Math.min(...trips.map((trip) => trip.priceFrom).filter((p) => p > 0));
  return Number.isFinite(cheapest) ? formatAmount(computeDepositAmount(cheapest)) : "a 10% deposit";
}

function isTelluride(trip: PublicTrip): boolean {
  return isTellurideDestination(trip.destination);
}

/** "Monday", read without going through a timezone. */
function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** "Dec 14–18": the range without its year, for a line that lists several. */
function shortRange(trip: PublicTrip): string {
  return formatDateRange(trip.startDate, trip.endDate).replace(/, \d{4}$/, "");
}

/** "Dec 14–18 or Jan 4–8", or with commas before the last when there are more. */
function orList(items: string[]): string {
  return items.length <= 2 ? items.join(" or ") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
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
 * (January is dearer, from September 2026), so each date carries its own.
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

/** The lowest price, and whether it is "from" (the dates differ) or the price on every date. */
function packagePrice(option: PackageOption): { price: string; from: boolean } {
  const prices = option.offers.map((o) => o.tier.price);
  return { price: formatPrice(Math.min(...prices)), from: new Set(prices).size > 1 };
}

/** Whether this offer can be booked right now. */
function offerOpen({ trip, tier }: { trip: PublicTrip; tier: PublicTier }): boolean {
  const taken = tier.claimed || isTaken(tier.name, tier.spotsLeft);
  return !taken && !(tier.spotsLeft !== null && tier.spotsLeft <= 0) && trip.status !== "soldOut";
}

export default async function TelluridePage() {
  const trips = (await getPublishedTrips()).filter(isTelluride);
  const openTrips = trips.filter((trip) => trip.status !== "soldOut");
  const bookable = BOOKINGS_OPEN && openTrips.length > 0;

  const nights = shared(trips, (trip) => nightCount(trip.startDate, trip.endDate));
  const firstDay = shared(trips, (trip) => weekday(trip.startDate));
  const lastDay = shared(trips, (trip) => weekday(trip.endDate));
  const packages = TRIP_DETAILS_OPEN ? packageOptions(trips) : [];
  const priceFrom = Math.min(...openTrips.map((trip) => trip.priceFrom).filter((p) => p > 0));
  const datesLine = orList((openTrips.length > 0 ? openTrips : trips).map(shortRange));
  const nightsLabel = nights !== null ? `${spelled(nights)} nights` : "Every night";

  // In page order: the trip first, then the week, then the place.
  const sections: SectionLink[] = [
    { href: "#included", label: "What you get" },
    ...(packages.length > 0 ? [{ href: "#rooms" as const, label: "Rooms" }] : []),
    { href: "#events", label: "The week" },
    { href: "#overview", label: "Telluride" },
    { href: "#details", label: "Good to know" },
  ];

  const highlights = TRIP_WHAT_YOU_GET.filter((item) => item.image);
  const theRest = TRIP_WHAT_YOU_GET.filter((item) => !item.image);

  const page = (
    <main className="scheme-light scheme-paint">
      {/* ---- masthead -------------------------------------------------------
          Two layouts from one set of elements, arranged by grid areas.

          On a phone, in source order: the photograph full-bleed under the
          transparent site nav, then the headline, the trip in six lines, the
          price and Reserve on paper. Only a fade at the very top, behind the
          nav, so its white type reads against the sky; tuned by sampling this
          photograph under the logo and Menu at 390 wide, where the brightest
          pixel behind either stays above 4.5:1.

          From md the photograph sits beside the headline at its own 3:2, so
          none of it is cropped (a full-width band at desktop proportions cut
          off the gondola and the skier, 29 September 2026), the price and
          Reserve go under the headline, and the six lines run across the foot
          in three columns. The nav is the solid bar there (overHero="phone"
          in SiteNav). Above the fold, so nothing here is wrapped in Reveal. */}
      <header
        className={[
          "shell grid pb-14 md:pb-20 md:pt-28 lg:pt-32",
          "md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-x-12 lg:gap-x-20",
          "md:[grid-template-areas:'head_photo'_'offer_photo'_'facts_facts']",
        ].join(" ")}
      >
        <div className="relative -mx-gutter h-[44svh] min-h-[17rem] bg-[--surface-inset] md:mx-0 md:aspect-[3/2] md:h-auto md:min-h-0 md:self-center md:[grid-area:photo]">
          <Image
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            fill
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
            style={{ objectPosition: "62% 40%" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[rgb(42_35_32_/_0.74)] via-[rgb(42_35_32_/_0.52)] to-transparent md:hidden"
          />
        </div>

        <div className="flex flex-col gap-4 pt-7 md:gap-6 md:self-end md:pt-0 md:[grid-area:head]">
          <p className="t-label text-[--text-secondary]">Telluride, Colorado</p>
          <h1 className="max-w-[15ch] font-display text-display-l font-medium leading-[1.04] tracking-title text-[--text]">
            {nights !== null ? `${spelled(nights)} nights in Telluride with your friends` : "A week in Telluride with your friends"}
          </h1>
          <p className="t-lede max-w-[38ch]">
            We book the hotel, the lifts, the rides and the nights out. You
            pick the week and show up.
          </p>
        </div>

        {/* The trip in six lines, a label in ink and its value in gray, the
            way the brand book sets its detail rows: side by side on a phone,
            the label over its value in three columns from md. */}
        <dl className="m-0 mt-8 grid gap-y-3 font-body text-body-s leading-[1.45] md:mt-14 md:grid-cols-3 md:gap-x-10 md:gap-y-6 md:border-t md:border-[--rule-strong] md:pt-8 md:[grid-area:facts]">
          {[...(trips.length > 0 ? [{ label: "Dates", value: datesLine }] : []), ...TELLURIDE_AT_A_GLANCE].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[5.75rem_minmax(0,1fr)] content-start gap-x-4 sm:grid-cols-[7rem_minmax(0,1fr)] md:grid-cols-1 md:gap-y-1"
            >
              <dt className="font-medium text-[--text]">{row.label}</dt>
              <dd className="m-0 text-[--text-secondary]">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col md:mt-8 md:self-start md:[grid-area:offer]">
          {TRIP_DETAILS_OPEN && Number.isFinite(priceFrom) && (
            <div className="mt-7 flex items-end justify-between gap-6 border-t border-[--rule-strong] pt-5 md:mt-0">
              <p className="m-0 flex flex-col">
                <span className="t-micro text-[--text-secondary]">From</span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-display-m font-medium leading-none tracking-title text-[--text]">
                    {formatPrice(priceFrom)}
                  </span>
                  <span className="font-body text-body-s text-[--text-secondary]">per person</span>
                </span>
              </p>
              {bookable && (
                <p className="m-0 text-right font-body text-body-s leading-[1.45] text-[--text-secondary]">
                  Hold your spot
                  <br />
                  with {depositFrom(openTrips)}
                </p>
              )}
            </div>
          )}

          {/* data-reserve-bar-hide: the phone Reserve bar steps aside while
              this button is on screen, so there is one ask at a time.
              Straight to the booking page, which asks for the dates, then
              the package. */}
          <div data-reserve-bar-hide className="mt-5 flex flex-col gap-4">
            {bookable ? (
              <Button href="/bookings/new" variant="primary" size="lg" block>
                Reserve your spot
              </Button>
            ) : !BOOKINGS_OPEN && TRIP_DETAILS_OPEN ? (
              // Paying is list-only: the emailed link is the way in.
              <WaitlistButton label={LIST_BOOKING_CTA} variant="primary" size="lg" placement="telluride-hero" />
            ) : (
              <Button href="#departures" variant="primary" size="lg" block>
                See the dates
              </Button>
            )}
            {bookable && <CreditLine />}
          </div>
        </div>
      </header>

      <SectionNav links={sections} />

      {/* ---- what you get -------------------------------------------------------
          id="included" is linked from the booking emails. Do not rename it,
          and keep it rendering in every launch state.

          Four inclusions as photographs, two by two on a phone, then the rest
          as a list. Paper, like the masthead: the stone panel below is where
          the prices are. */}
      <section id="included" className={SECTION_SCROLL} aria-labelledby="included-heading">
        <div className="shell py-16 md:py-24">
          <Reveal>
            <p className="t-rule-label text-[--text]">What you get</p>
            <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
              <h2 id="included-heading" className="t-title max-w-[14ch] text-[--text]">
                It&rsquo;s all booked before you land
              </h2>
              <p className="t-lede">
                Every package comes with all of this. Your package only decides
                the room.
              </p>
            </div>
          </Reveal>

          <ul className="m-0 mt-10 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:mt-14 lg:grid-cols-4 lg:gap-x-6">
            {highlights.map((item, i) => (
              <Reveal as="li" key={item.title} delay={(i % 4) * 80} className="flex flex-col">
                <Plate image={item.image} ratio="aspect-[4/5]" sizes="(min-width: 1024px) 25vw, 50vw" />
                <p className="m-0 mt-3 font-display text-body font-medium leading-snug text-[--text]">{item.title}</p>
                <p className="m-0 mt-1 font-body text-body-s leading-[1.5] text-[--text-secondary]">
                  {item.body.replace("{nights}", nightsLabel)}
                </p>
              </Reveal>
            ))}
          </ul>

          <Reveal>
            <h3 className="t-micro mt-14 text-[--text-secondary] md:mt-16">Also in every package</h3>
            <ul className="m-0 mt-4 grid list-none gap-x-10 border-t border-[--rule-strong] p-0 sm:grid-cols-2">
              {theRest.map((item) => (
                <li key={item.title} className="flex gap-4 border-b border-[--rule] py-4">
                  {/* A marker, not text, so club blue's 2.2:1 on paper carries
                      no meaning here. */}
                  <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 bg-club" />
                  <div className="min-w-0">
                    <p className="m-0 font-display text-body font-medium leading-snug text-[--text]">{item.title}</p>
                    <p className="m-0 mt-1 font-body text-body-s leading-[1.55] text-[--text-secondary]">
                      {item.body.replace("{nights}", nightsLabel)}
                    </p>
                  </div>
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
        </div>
      </section>

      {/* ---- rooms and prices -----------------------------------------------
          Warm gray, the page's one stone panel, so the prices stand apart from
          the paper above and the espresso week below. On stone, secondary text
          is #564E48 (5.4:1). One card per package in a row that a thumb
          swipes sideways (the next card peeks in so it reads as a row), four
          across from lg. Then the dates, each with its own Reserve. */}
      <section
        id="rooms"
        className={`scheme-stone scheme-paint ${SECTION_SCROLL}`}
        aria-labelledby="rooms-heading"
      >
        <div className="shell py-16 md:py-24">
          <Reveal>
            <p className="t-rule-label text-[--text]">{TRIP_DETAILS_OPEN ? "Rooms and prices" : "Where you stay"}</p>
            <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-20">
              <h2 id="rooms-heading" className="t-title max-w-[14ch] text-[--text]">
                Pick your room
              </h2>
              <p className="t-lede">
                Everyone stays at The Peaks, ski-in, ski-out, up in Mountain
                Village. Your package decides the room and who&rsquo;s in it.
              </p>
            </div>
          </Reveal>

          {packages.length > 0 ? (
            <Reveal>
              {/* relative: the row is the containing block for anything
                  absolutely placed inside a card (the photo button's hidden
                  label, the button underline), so it clips them too. Without
                  it they escape the scroll and widen the whole phone page. */}
              <ul
                aria-label="Packages"
                data-reserve-bar-hide
                className="relative -mx-gutter mt-10 flex list-none items-start snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter pb-3 [scrollbar-width:none] md:mt-14 lg:mx-0 lg:grid lg:grid-cols-4 lg:items-stretch lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {packages.map((option) => (
                  <RoomCard key={option.key} option={option} tripCount={trips.length} />
                ))}
              </ul>
              {packages.length > 1 && (
                <p aria-hidden="true" className="t-micro mt-3 text-[--text-secondary] lg:hidden">
                  Swipe for every room
                </p>
              )}
            </Reveal>
          ) : (
            !TRIP_DETAILS_OPEN && (
              <p className="mt-12 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                The rooms, the packages and what each one adds go up with the
                pricing when booking opens.
              </p>
            )
          )}

          <Reveal>
            <div id="departures" data-reserve-bar-hide className={`mt-16 md:mt-20 ${SECTION_SCROLL}`}>
              <h3 className="t-heading text-[--text]">The dates</h3>
              {trips.length > 0 ? (
                <ul className="m-0 mt-6 flex list-none flex-col border-t border-[--rule-strong] p-0">
                  {trips.map((trip) => (
                    <DateRow key={trip.id} trip={trip} />
                  ))}
                </ul>
              ) : (
                <p className="mt-6 max-w-measure border-t border-[--rule-strong] pt-5 font-body text-body leading-[1.75] text-[--text-secondary]">
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

      {/* ---- Telluride ------------------------------------------------------
          After the trip and the week, not before them: the place comes once
          people know what they get. One paragraph and four figures, then the
          photographs, which run off the right edge so the track reads as
          scrollable. */}
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
          to reserve. data-reserve-bar-hide: it has its own Reserve. */}
      {BOOKINGS_OPEN ? (
        <section data-reserve-bar-hide className="scheme-club scheme-paint" aria-labelledby="close-heading">
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

  // Nothing to book, nothing to offer: no pop-up, no bar.
  if (!bookable) return page;

  return (
    <WelcomeCreditProvider bookHref="/bookings/new">
      {page}
      <MobileReserveBar href="/bookings/new" place="Telluride" dates={datesLine} fromStart />
    </WelcomeCreditProvider>
  );
}

/* -- one package ---------------------------------------------------------------- */

/**
 * A package as a card: its room's photograph, its name and price, the three
 * things it leads with (the room, then what it adds), every date it is on with
 * that date's price and how it stands, and one Reserve. Reserve arrives at
 * checkout with the package chosen: straight to the date when only one is
 * open, otherwise to "Choose your dates" carrying the package along.
 */
function RoomCard({ option, tripCount }: { option: PackageOption; tripCount: number }) {
  const { room } = option;
  // Four to a Room and Two to a Room are the same room: the second card leads
  // with the room's second photograph, so the row is not one picture twice.
  const photo = (room?.key === "MID" ? room.photos[1] : null) ?? room?.photos[0] ?? null;
  const open = option.offers.filter(offerOpen);
  const anyTaken = option.offers.some(({ tier }) => tier.claimed || isTaken(tier.name, tier.spotsLeft));
  const price = packagePrice(option);
  const lead = option.inclusions.slice(0, 3);
  const more = option.inclusions.slice(3);
  // Tier id when one date is open: it cannot be mistyped or renamed out from
  // under the link. The name otherwise, since each date's tier has its own id
  // and the dates step matches either.
  const href =
    open.length === 1
      ? `/bookings/new?trip=${open[0].trip.id}&package=${open[0].tier.id}`
      : `/bookings/new?package=${encodeURIComponent(option.offers[0].tier.name)}`;

  return (
    <li className="flex w-[82%] max-w-[22rem] shrink-0 snap-start flex-col bg-[--surface-raised] sm:w-[46%] lg:w-auto lg:max-w-none">
      {photo ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-[--surface-inset]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 46vw, 82vw"
            className="object-cover"
          />
        </div>
      ) : room ? (
        <RoomPanel room={room} size="card" />
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-display-s font-medium leading-tight tracking-title text-[--text]">
          {option.label}
        </h3>
        {option.description && (
          <p className="m-0 mt-1 font-body text-body-s leading-[1.5] text-[--text-secondary]">{option.description}</p>
        )}
        {TRIP_DETAILS_OPEN && (
          // "From" on its own line, as in the masthead, so the figure never
          // wraps in a card a quarter of the page wide.
          <p className="m-0 mt-4 flex flex-col">
            <span className="t-micro text-[--text-secondary]">{price.from ? "From" : "Per person"}</span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-display-m font-medium leading-none tracking-title text-[--text]">
                {price.price}
              </span>
              {price.from && <span className="font-body text-body-s text-[--text-secondary]">per person</span>}
            </span>
          </p>
        )}

        {lead.length > 0 && (
          <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0">
            {lead.map((item) => (
              <Inclusion key={item}>{item}</Inclusion>
            ))}
          </ul>
        )}
        {more.length > 0 && (
          <details className="group mt-1">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-body text-body-s text-[--accent] underline underline-offset-4 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Everything included</span>
              <span className="hidden group-open:inline">Show less</span>
            </summary>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 pb-2">
              {more.map((item) => (
                <Inclusion key={item}>{item}</Inclusion>
              ))}
            </ul>
          </details>
        )}

        {/* Pushed to the foot on a wide screen, so Reserve lines up across
            the four; on a phone each card is its own height. */}
        <div className="mt-auto pt-5">
          <dl className="m-0 flex flex-col border-t border-[--rule] font-body text-body-s">
            {option.offers.map(({ trip, tier }) => {
              const taken = tier.claimed || isTaken(tier.name, tier.spotsLeft);
              const status = offerOpen({ trip, tier })
                ? tierAvailabilityLabel(tier.spotsLeft)
                : (tierAvailabilityLabel(tier.spotsLeft, taken) ?? "Sold out");
              return (
                <div key={tier.id} className="flex items-baseline justify-between gap-4 border-b border-[--rule] py-2.5">
                  <dt className="text-[--text]">{shortRange(trip)}</dt>
                  <dd className="m-0 text-right tabular-nums text-[--text-secondary]">
                    {TRIP_DETAILS_OPEN && formatPrice(tier.price)}
                    {status && (
                      <span className="t-micro ml-2 text-[--text-secondary]">{status}</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {option.offers.length < tripCount && (
            <p className="t-micro mt-2 text-[--text-secondary]">
              Only on {option.offers.length === 1 ? "this date" : "these dates"}
            </p>
          )}
          {anyTaken && (
            <p className="mt-2 font-body text-body-s leading-[1.5] text-[--text-secondary]">{TAKEN_NOTE}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {BOOKINGS_OPEN && open.length > 0 ? (
              <Button href={href} variant="primary" size="md">
                Reserve
              </Button>
            ) : !BOOKINGS_OPEN ? (
              // No Reserve while paying is list-only; this is the way in.
              <WaitlistButton label={LIST_BOOKING_CTA} variant="primary" size="md" placement="telluride-rooms" />
            ) : null}
            {room && room.photos.length > 1 && <RoomPhotosButton photos={room.photos} title={room.title} />}
          </div>
        </div>
      </div>
    </li>
  );
}

function Inclusion({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 font-body text-body-s leading-[1.5] text-[--text]">
      <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 bg-[--text]" />
      <span>{children}</span>
    </li>
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
