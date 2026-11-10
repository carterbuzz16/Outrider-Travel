import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, CampusMarquee, HeroVideo, Logo, Reveal, RoomPanel, RoomPhotosButton, VideoBand, WaitlistCTA } from "@/components/ui";
import MobileReserveBar from "@/app/(site)/trips/[id]/MobileReserveBar";
import { formatAmount } from "@/lib/balance";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { DEPOSIT_AMOUNT, holdSpotLine } from "@/lib/deposit";
import { balanceDueDates, howTheRestIsPaid, mustPayInFull } from "@/lib/installments";
import { pageMetadata } from "@/lib/metadata";
import { getRoomMedia, tierDisplayName, type RoomMedia } from "@/lib/room-media";
import { SPRING_BREAK_STARTS } from "@/lib/signup-deadline";
import { SPRING_BREAK, SPRING_BREAK_PLACEMENT } from "@/lib/site-content";
import { SPRING_BREAK_LINE, tripsOnLine } from "@/lib/trip-lines";
import {
  availabilityLabel,
  formatDateRange,
  formatPrice,
  getPublishedTrips,
  tierAvailabilityLabel,
  type PublicTier,
  type PublicTrip,
} from "@/lib/trips";
import { springBreakPreview } from "./preview";

/*
 * /spring-break: the trip page ambassadors and ads send people to, to put $100
 * down (Carter, 3 November 2026: he wants it to "look legit"). It was a door to
 * the list from 1 October. About nine in ten arrive on a phone from Instagram, so
 * it follows /telluride, the proven ad landing page, without Telluride's
 * events or sponsors: none exist here yet. No login wall, and what you get comes
 * before the price. In page order:
 *
 *   masthead      the resort moving under the transparent nav, the Beach Club's
 *                 lock-up and the headline straight on it
 *   the panel    orange, as on his Punta Cana graphic: ALL-INCLUSIVE across the top,
 *                 what's included, $100 down with the trip price beside it, the weeks
 *                 and Reserve, then the schools rolling, which is what says "college"
 *                 (#trip)
 *   the films     one headline each: the coast (#crowd), the evenings (#nights) with
 *                 the restaurants and bars as a strip to swipe, the water (#days), the
 *                 catamaran (#bay), and what's past the gates (#out)
 *   Rooms         one card per package with its price on each week and a Reserve
 *                 that arrives with both chosen (#rooms, #departures)
 *   Good to know  folded away, so the facts are there and don't read as copy (#details)
 *   close         the orange again, handing into the espresso footer
 *
 * The page is in one of three states, and all of them have to look finished:
 *
 *   on sale       a spring trip is published and open: Reserve everywhere
 *   before sale   nothing published, which is the state on 3 November 2026: every
 *                 section still shows, with the weeks from SPRING_BREAK_STARTS, no
 *                 price and no Reserve, and the list as the one ask
 *   past sale     every published week is closed or full: the same, saying so. A
 *                 single week past its close (trip.bookingClosed) reads as closed
 *                 in place while the other stays on sale.
 *
 * Prices and dates come from the published trips. Nothing about a departure is
 * hard-coded, and a new package appears here when it is added in /admin/trips.
 * Copy that rests on Carter's facts is in SPRING_BREAK (lib/site-content.ts).
 *
 * The clips and photographs are the resort's own, from the library it OKed for the
 * site, as supplied, and listed in SPRING_BREAK. The first version used its lifestyle
 * photographs, and Carter found them "stock-photo-y" and too old for the trip (5
 * November 2026), so nothing here is a posed person. WANTED: real photographs of us
 * there. Nothing from a resort's library will look as much like college as a phone.
 */

export const metadata: Metadata = pageMetadata({
  title: "All-inclusive spring break in Punta Cana for college students",
  path: "/spring-break",
  description:
    "Spring break 2027 in Punta Cana for college students: four nights with your best friends at Zemi Miches, all-inclusive, right on the beach.",
  ownImage: true,
});

// Same cadence as /telluride, so publishing a departure shows up here without a redeploy.
export const revalidate = 300;

const LINK = "text-[--accent] underline underline-offset-4";

/** The fixed site nav (h-16, md:h-20). */
const SECTION_SCROLL = "scroll-mt-16 md:scroll-mt-20";

/** The tier spring break sells so far, for showing its room before any trip is published. */
const FIRST_TIER = "TWO TO A ROOM";

/** Four nights, as SPRING_BREAK says. Only for the weeks before their trips exist. */
const NIGHTS = 4;

const DEPOSIT = formatAmount(DEPOSIT_AMOUNT);

/* -- one big photograph ------------------------------------------------------ */

type Band = {
  title: string;
  line: string;
  image: { src: string; alt: string; position: string; mobilePosition: string };
};

/**
 * A full-bleed photograph, with the words on the dark foot of it. On a phone the frame
 * is too tall for that: whatever is low in the picture ends up under the words, so the
 * photograph stands above them on espresso instead.
 */
function PhotoBand({ id, title, line, image }: Band & { id: string }) {
  return (
    <section
      id={id}
      className={`scheme-espresso relative isolate flex flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[92svh] ${SECTION_SCROLL}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="relative h-[58svh] md:absolute md:inset-0 md:-z-10 md:h-auto">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          quality={85}
          className="object-cover [object-position:var(--pos-sm)] md:[object-position:var(--pos-md)]"
          style={{ "--pos-sm": image.mobilePosition, "--pos-md": image.position } as React.CSSProperties}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-[62%] bg-gradient-to-t from-[rgb(31_26_23_/_0.88)] via-[rgb(31_26_23_/_0.62)] via-50% to-transparent md:block"
      />
      <div className="shell py-10 md:pb-20 md:pt-0">
        <Reveal>
          <h2 id={`${id}-heading`} className="t-display m-0 max-w-[14ch] text-balance text-[--text]">
            {title}
          </h2>
          <p className="m-0 mt-4 max-w-[46ch] font-body text-body leading-[1.4] text-[--text]">{line}</p>
        </Reveal>
      </div>
    </section>
  );
}

/** One film and one headline, on the fade at its foot, with a line only if it's owed. */
function FilmBand({ id, clip, title, alt, line }: { id: string; clip: string; title: string; alt: string; line?: string }) {
  return (
    <section id={id} className={SECTION_SCROLL} aria-labelledby={`${id}-heading`}>
      <VideoBand
        src={`/video/spring-${clip}.mp4`}
        mobileSrc={`/video/spring-${clip}-phone.mp4`}
        poster={`/video/spring-${clip}-poster.jpg`}
        mobilePoster={`/video/spring-${clip}-phone-poster.jpg`}
        position="50% 50%"
        alt={alt}
        fade="foot"
        className="justify-end"
      >
        <div className="shell pb-10 md:pb-14">
          <Reveal>
            <h2 id={`${id}-heading`} className="t-display m-0 max-w-[28ch] text-balance text-[--text]">
              {title}
            </h2>
            {line && <p className="m-0 mt-4 max-w-[64ch] font-body text-body leading-[1.4] text-[--text]">{line}</p>}
          </Reveal>
        </div>
      </VideoBand>
    </section>
  );
}

/** A heading that opens to its detail: the same disclosure the FAQ uses. */
function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 t-subheading text-[--text] transition-colors duration-fast hover:text-[--accent] [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden="true" className="mt-1 shrink-0 text-[--accent] transition-transform duration-fast group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">{children}</div>
    </details>
  );
}

/* -- reading the trips ------------------------------------------------------- */

/**
 * Every Reserve on the page. A week or a package chosen goes straight to checkout
 * with it filled in (the fewest steps to pay); the general button lets checkout
 * ask, among spring break's weeks only. In preview they all stop at the page's own
 * note, so a sample trip's id never reaches a URL (./preview.ts).
 */
function reserveHref(preview: boolean, trip?: PublicTrip, tier?: PublicTier): string {
  if (preview) return "#preview-note";
  if (!trip) return `/bookings/new?line=${SPRING_BREAK_LINE.id}`;
  const base = `/bookings/new?trip=${trip.id}`;
  return tier ? `${base}&package=${encodeURIComponent(tier.name)}` : base;
}

/**
 * A week stops offering the deposit a few days before its last payment
 * (mustPayInFull, lib/installments.ts), and checkout then asks for the whole
 * price, so nothing may say "$100" about that week from that day on.
 */
function takesDeposit(trip: PublicTrip): boolean {
  return !mustPayInFull(trip.startDate);
}

function reserveWords(trip: PublicTrip): string {
  return takesDeposit(trip) ? `Reserve for ${DEPOSIT}` : "Reserve";
}

/** "Mar 8–12": the range without its year, for a line that lists several. */
function shortRange(startDate: string, endDate: string): string {
  return formatDateRange(startDate, endDate).replace(/, \d{4}$/, "");
}

function orList(items: string[]): string {
  return items.length <= 2 ? items.join(" or ") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** "Monday", read without going through a timezone. */
function weekday(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * The weeks for the phone bar, which has room for about a dozen characters beside
 * its button: "Mar 8 or 15". "Mar 8–12 or Mar 15–19" cut off after the first week.
 */
function barDates(trips: PublicTrip[]): string {
  if (trips.length === 1) return shortRange(trips[0].startDate, trips[0].endDate);
  const months = new Set(trips.map((trip) => shortRange(trip.startDate, trip.endDate).split(" ")[0]));
  return months.size === 1
    ? `${[...months][0]} ${orList(trips.map((trip) => String(Number(trip.startDate.slice(8)))))}`
    : orList(trips.map((trip) => shortRange(trip.startDate, trip.endDate)));
}

/** How a week stands, in words: nothing for a plain open one. */
function tripNote(trip: PublicTrip): string | null {
  if (weekFull(trip)) return SPRING_BREAK.weekFull;
  return trip.status === "open" ? null : availabilityLabel(trip.status, trip.bookingClosed);
}

/**
 * A week at its cap and still before its close: it says so and points at the list
 * (Carter, 10 November 2026: "show 'Week full, join the waitlist' instead of letting
 * people pay for it"). The cap is the package's capacity in /admin/trips, 20 a week
 * at opening, raised there with no deploy; createBooking and the database's
 * check_tier_capacity are what refuse a booking past it.
 */
function weekFull(trip: PublicTrip): boolean {
  return trip.status === "soldOut" && !trip.bookingClosed;
}

/** What the words say when nothing can be reserved. */
function shutTitle(trips: PublicTrip[]): string {
  if (trips.length === 0) return "Booking opens soon";
  if (trips.every((trip) => trip.bookingClosed)) return "Signups are closed";
  return trips.length === 1 ? "This week is full" : trips.length === 2 ? "Both weeks are full" : "Every week is full";
}

/**
 * The line beside the price, worded for the cheapest open package, the one "from"
 * names, so its Klarna words match that price (holdSpotLine, lib/deposit.ts).
 * Checkout says it per package.
 */
function holdLineFor(trips: PublicTrip[], priceFrom: number): string {
  return holdSpotLine(Math.min(...trips.map((trip) => balanceDueDates(trip.startDate).length)), priceFrom);
}

/* -- the packages, across weeks ---------------------------------------------- */

/**
 * One package as the reader chooses it: a kind of room, whichever weeks it is on,
 * as on /telluride. Merged by name, because each week's tier is its own row, and
 * a package lists only the weeks it is actually on.
 */
type PackageOption = {
  key: string;
  label: string;
  room: RoomMedia | null;
  description: string | null;
  inclusions: string[];
  offers: { trip: PublicTrip; tier: PublicTier }[];
};

/** "Ocean  View " and "OCEAN VIEW" are the same package. */
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
        const room = getRoomMedia(tier.name);
        byKey.set(key, {
          key,
          label: tierDisplayName(tier.name),
          room,
          description: tier.description ?? room?.summary ?? null,
          inclusions: tier.inclusions,
          offers: [{ trip, tier }],
        });
      }
    }
  }
  const lowest = (option: PackageOption) => Math.min(...option.offers.map((o) => o.tier.price));
  return [...byKey.values()].sort((a, b) => lowest(a) - lowest(b) || a.label.localeCompare(b.label));
}

/** The lowest price, and whether it is "from" (the weeks differ) or the price on every week. */
function packagePrice(option: PackageOption): { price: string; from: boolean } | null {
  if (option.offers.length === 0) return null;
  const prices = option.offers.map((o) => o.tier.price);
  return { price: formatPrice(Math.min(...prices)), from: new Set(prices).size > 1 };
}

/** One week as a package card lists it. No price and no link before anything is on sale. */
type WeekView = {
  key: string;
  startDate: string;
  endDate: string;
  price: string | null;
  note: string | null;
  href: string | null;
  reserve: string;
  /** At its cap: the row leads to the waitlist instead (weekFull). */
  full?: boolean;
};

function offerWeek({ trip, tier }: { trip: PublicTrip; tier: PublicTier }, preview: boolean): WeekView {
  const open = !tier.claimed && !(tier.spotsLeft !== null && tier.spotsLeft <= 0) && trip.status !== "soldOut";
  const full = !trip.bookingClosed && !tier.claimed && !open;
  return {
    key: tier.id,
    startDate: trip.startDate,
    endDate: trip.endDate,
    price: formatPrice(tier.price),
    // A week's close is the news when there is one; otherwise this package's own
    // count, which can be full while the week is not.
    note: trip.bookingClosed
      ? availabilityLabel(trip.status, true)
      : full
        ? null
        : (tierAvailabilityLabel(tier.spotsLeft, tier.claimed) ?? tripNote(trip)),
    href: open && BOOKINGS_OPEN ? reserveHref(preview, trip, tier) : null,
    reserve: reserveWords(trip),
    full,
  };
}

/* -- the page ----------------------------------------------------------------- */

export default async function SpringBreakPage() {
  const sample = springBreakPreview();
  const preview = sample !== null;
  const trips = sample ?? tripsOnLine(await getPublishedTrips(), SPRING_BREAK_LINE);
  const openTrips = trips.filter((trip) => trip.status !== "soldOut");
  const bookable = BOOKINGS_OPEN && openTrips.length > 0;
  const beforeSale = trips.length === 0;

  const prices = openTrips.map((trip) => trip.priceFrom).filter((price) => price > 0);
  const priceFrom = prices.length > 0 ? Math.min(...prices) : null;
  const deposit = openTrips.some(takesDeposit);

  // The weeks at the top of the page: the published ones, or until there are any,
  // the two whose bookings and payments are already set up.
  const weeks: WeekTileView[] = beforeSale
    ? SPRING_BREAK_STARTS.map((start) => ({
        key: start,
        startDate: start,
        endDate: addDays(start, NIGHTS),
        note: null,
        href: null,
      }))
    : trips.map((trip) => ({
        key: trip.id,
        startDate: trip.startDate,
        endDate: trip.endDate,
        note: tripNote(trip),
        full: weekFull(trip),
        // Straight to the form when this week has one package to choose.
        href:
          bookable && trip.status !== "soldOut"
            ? reserveHref(preview, trip, trip.tiers.length === 1 ? trip.tiers[0] : undefined)
            : null,
      }));

  const packages = packageOptions(trips);
  // Before sale there is no tier to read, so the room is shown under its own name.
  const firstRoom = getRoomMedia(FIRST_TIER);
  const shown: PackageOption[] =
    packages.length > 0
      ? packages
      : [
          {
            key: FIRST_TIER,
            label: tierDisplayName(FIRST_TIER),
            room: firstRoom,
            description: firstRoom?.summary ?? null,
            inclusions: [],
            offers: [],
          },
        ];
  const single = shown.length === 1;

  const page = (
    <main className="scheme-espresso scheme-paint">
      {/* ---- masthead -------------------------------------------------------
          Same build as /telluride: full bleed under the transparent nav, then
          the trip on solid ground. Above the fold, so nothing is in Reveal.

          The resort's own film, cut for this page: the resort from the air, then the
          pools, and no people until the last shot (Carter, 3 November 2026: the hero
          must be the resort). Phones get a portrait cut of the vertical film. Both are
          silent, and HeroVideo holds the poster for anyone who has asked for reduced
          motion.

          Two fades and no even scrim, so the water stays bright. Measured on 5 November
          2026 over the length of both clips, the worst pixel behind paper text: at 1440
          wide the nav 5.7:1, the small lines 7.4:1, the headline 3.9:1 (it is large); at 390
          wide the nav 4.9:1, the small lines 6.7:1, the headline 4.2:1.

          The headline is one line, as wide as the screen allows: 13vw fits
          "PUNTA CANA" (6.7em in Figtree Extrabold) inside the gutters at every
          width, and the cap stops it outgrowing the shell. The label goes under
          it, where the fade is strongest, so the fade can stop lower and leave
          the water alone.

          "All-inclusive" is not here on purpose. It was this headline's second line for an
          afternoon, and Carter took it out (5 November 2026): "I like it in the orange, but
          not in the hero." */}
      <header>
        <div className="scheme-espresso relative isolate flex min-h-[84svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[90svh]">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <HeroVideo
              src="/video/spring-hero.mp4"
              mobileSrc="/video/spring-hero-phone.mp4"
              poster="/video/spring-hero-poster.jpg"
              mobilePoster="/video/spring-hero-phone-poster.jpg"
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-[rgb(42_35_32_/_0.68)] via-[rgb(42_35_32_/_0.56)] via-50% to-transparent md:h-40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[22rem] bg-gradient-to-t from-[rgb(31_26_23_/_0.84)] via-[rgb(31_26_23_/_0.66)] via-50% to-transparent md:h-[72%]"
          />
          <div className="shell pb-8 pt-40 md:pb-16">
            <Logo variant="beach-club" className="mb-5 w-full max-w-[17rem] text-[--text] md:mb-7 md:max-w-[22rem]" />
            <h1 className="m-0 whitespace-nowrap font-display text-[length:min(13vw,11.4rem)] font-extrabold uppercase leading-[0.92] tracking-display text-[--text]">
              {SPRING_BREAK.headline}
            </h1>
            <p className="t-label mt-3 text-[--text] md:mt-4">{SPRING_BREAK.label}</p>
            <p className="m-0 mt-3.5 max-w-[46ch] font-body text-lede leading-[1.4] text-[--text] md:mt-5">
              {SPRING_BREAK.tagline}
            </p>
            {/* So nobody books expecting the Punta Cana hotel strip. */}
            <p className="m-0 mt-1.5 max-w-[56ch] font-body text-body-s leading-[1.45] text-[--text] md:text-body">
              {SPRING_BREAK.coast}
            </p>
          </div>
        </div>

        {preview && (
          <p
            id="preview-note"
            className="scheme-stone scheme-paint m-0 scroll-mt-20 px-gutter py-3 font-body text-body-s leading-[1.5] text-[--text]"
          >
            Preview only. These are sample trips, not from the database, and Reserve is switched off.
          </p>
        )}

      </header>

      {/* ---- the panel --------------------------------------------------------
          Carter's own Punta Cana graphic, as a section: the resort, then orange with
          what's included and the price, in short lines. The schools roll at its foot
          because the name of your school is the one thing on this page a resort's
          library can't supply. Deep espresso on this orange measures 4.7:1, and
          .scheme-spring keeps every text token at full strength. */}
      <section id="trip" className={`scheme-spring scheme-paint ${SECTION_SCROLL}`} aria-labelledby="trip-heading">
        <div className="shell grid gap-8 py-12 md:grid-cols-2 md:gap-x-20 md:gap-y-12 md:py-20">
          {/* The whole width, sized like the masthead's headline so it fills the shell: the
              one thing on this panel nobody should be able to miss (Carter, 5 November 2026). */}
          <h2
            id="trip-heading"
            className="m-0 whitespace-nowrap font-display text-[length:min(11.8vw,10.1rem)] font-extrabold uppercase leading-[0.92] tracking-display text-[--text] md:col-span-2"
          >
            {SPRING_BREAK.includedHeadline}
          </h2>
          <div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {SPRING_BREAK.whatYouGet.map((item) => (
                <li key={item} className="font-display text-lede font-medium leading-snug text-[--text]">
                  {item}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-5 font-body text-body-s leading-[1.5] text-[--text]">{SPRING_BREAK.notIncluded}</p>
          </div>

          <div className="flex flex-col">
            {/* $100 down is the big number (Carter, 13 October 2026: "the big
                thing needs to be people knowing it's only $100 down"), with the
                trip price right beside it, never behind a click: a deposit shown
                without the total is what the FTC's fee rule for lodging targets.
                From the day neither week takes a deposit, the price is the number. */}
            {bookable && priceFrom !== null && (deposit ? (
              <>
                <div className="flex items-end justify-between gap-6">
                  <p className="m-0 flex items-baseline gap-2">
                    <span className="font-display text-[length:clamp(3.25rem,2.6rem+2.6vw,4.5rem)] font-extrabold leading-none tracking-title text-[--text]">
                      {DEPOSIT}
                    </span>
                    <span className="font-body text-body text-[--text]">down</span>
                  </p>
                  <p className="m-0 text-right font-body text-body-s leading-[1.45] text-[--text]">
                    All-inclusive
                    <br />
                    from {formatPrice(priceFrom)}
                    <br />
                    per person
                  </p>
                </div>
                <p className="m-0 mt-3 font-body text-body-s leading-[1.5] text-[--text]">
                  {holdLineFor(openTrips, priceFrom)}
                </p>
              </>
            ) : (
              <p className="m-0 flex flex-col">
                <span className="t-micro text-[--text]">All-inclusive from</span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-display-l font-extrabold leading-none tracking-title text-[--text]">
                    {formatPrice(priceFrom)}
                  </span>
                  <span className="font-body text-body-s text-[--text]">per person</span>
                </span>
              </p>
            ))}

            <ul className="m-0 mt-6 grid list-none grid-cols-2 gap-2 p-0">
              {weeks.map((week) => (
                <WeekTile key={week.key} week={week} />
              ))}
            </ul>

            {/* data-reserve-bar-hide: the phone bar steps aside while this button
                is on screen, so there is one ask at a time. */}
            <div data-reserve-bar-hide className="mt-4 flex flex-col gap-4">
              {bookable ? (
                <>
                  <Button href={reserveHref(preview)} variant="primary" size="lg" block>
                    {deposit ? `Reserve for ${DEPOSIT}` : "Reserve"}
                  </Button>
                  <p className="m-0 font-body text-body-s leading-[1.5] text-[--text]">{SPRING_BREAK.codesLine}</p>
                </>
              ) : (
                <>
                  <p className="t-heading m-0 text-[--text]">{shutTitle(trips)}</p>
                  <Button href="#join" variant="primary" size="lg" block>
                    Join the list
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <CampusMarquee className="!pb-12 !pt-0 md:!pb-20" />
      </section>

      {/* ---- the films ---------------------------------------------------------
          One after another with no gap, the way Palm Tree Crew's run. The resort's own
          films, cut for this: nothing to read but the headline. */}
      <FilmBand id="crowd" clip="crowd" title={SPRING_BREAK.crowd.title} alt={SPRING_BREAK.crowd.alt} />
      <FilmBand id="nights" clip="nights" title={SPRING_BREAK.nights.title} alt={SPRING_BREAK.nights.alt} line={SPRING_BREAK.nights.line} />

      {/* The restaurants and bars, by name, to swipe through. Only those a Tropical View
          room reaches: see the note above SPRING_BREAK. */}
      <section aria-label="The restaurants and bars">
        <ul
          tabIndex={0}
          className="m-0 flex list-none snap-x snap-mandatory scroll-pl-gutter gap-2 overflow-x-auto py-8 pl-[max(var(--gutter),calc((100%-var(--shell))/2+var(--gutter)))] pr-gutter [scrollbar-width:none] md:py-12 [&::-webkit-scrollbar]:hidden"
        >
          {SPRING_BREAK.venues.map((venue) => (
            <li key={venue.name} className="w-[66%] shrink-0 snap-start sm:w-[38%] lg:w-[22%]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[--surface-inset]">
                <Image
                  src={venue.src}
                  alt={venue.alt}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 38vw, 66vw"
                  quality={85}
                  className="object-cover"
                />
              </div>
              <p className="m-0 mt-3 font-display text-lede font-extrabold uppercase leading-tight tracking-title text-[--text]">
                {venue.name}
              </p>
              <p className="m-0 mt-1 font-body text-body-s text-[--text-secondary]">{venue.kind}</p>
            </li>
          ))}
        </ul>
      </section>

      <FilmBand id="days" clip="days" title={SPRING_BREAK.days.title} alt={SPRING_BREAK.days.alt} />
      <PhotoBand id="bay" {...SPRING_BREAK.bay} />
      <FilmBand id="out" clip="out" title={SPRING_BREAK.out.title} alt={SPRING_BREAK.out.alt} line={SPRING_BREAK.out.line} />

      {/* ---- rooms and prices ------------------------------------------------
          The page's one stone panel, as on /telluride, so the prices stand apart.
          The heading is enough: the room's facts are on its own card.

          One package today (Carter may add an ocean view or Club Azure). A lone
          card in a swipe row would look like a mistake, so it takes the full
          width, the room beside its weeks, and the section asks for the week.
          From two packages on it is /telluride's row: cards a thumb swipes
          sideways, the next one peeking in, side by side from lg.

          Each week in a card has its own Reserve, with its price, so one tap
          lands in checkout with the week and the package both chosen. That is
          also why there is no separate list of dates under the cards. */}
      <section id="rooms" className={`scheme-stone scheme-paint ${SECTION_SCROLL}`} aria-labelledby="rooms-heading">
        <div className="shell py-16 md:py-24">
          <Reveal>
            <h2 id="rooms-heading" className="t-display m-0 max-w-[14ch] text-[--text]">
              {!bookable ? (weeks.length === 2 ? "Two weeks in March" : "The dates") : single ? "Pick your week" : "Pick your room"}
            </h2>
          </Reveal>

          <Reveal>
            {/* relative: the row is the containing block for anything absolutely
                placed in a card, so it clips them too. Without it they escape the
                scroll and widen the whole phone page (found on /telluride). */}
            <ul
              id="departures"
              aria-label="Packages"
              data-reserve-bar-hide
              className={
                single
                  ? `m-0 mt-10 list-none p-0 md:mt-14 ${SECTION_SCROLL}`
                  : `relative -mx-gutter mt-10 flex list-none items-start snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter pb-3 [scrollbar-width:none] md:mt-14 lg:mx-0 lg:grid ${ROW_COLUMNS[Math.min(shown.length, 4)] ?? ""} lg:items-stretch lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden ${SECTION_SCROLL}`
              }
            >
              {shown.map((option) => (
                <RoomCard
                  key={option.key}
                  option={option}
                  wide={single}
                  weeks={
                    option.offers.length > 0
                      ? option.offers.map((offer) => offerWeek(offer, preview))
                      : weeks.map((week) => ({ ...week, price: null, href: null, reserve: "" }))
                  }
                />
              ))}
            </ul>
            {!single && (
              <p aria-hidden="true" className="t-micro mt-3 text-[--text-secondary] lg:hidden">
                Swipe for every room
              </p>
            )}
          </Reveal>

          {beforeSale && (
            <Reveal>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
                <p className="m-0 max-w-measure font-body text-body leading-[1.5] text-[--text]">
                  {SPRING_BREAK.formBodyBeforeBooking}
                </p>
                <Button href="#join" variant="secondary" size="md">
                  Join the list
                </Button>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---- good to know ---------------------------------------------------
          Everything someone may want before paying, folded so it isn't copy to get
          through. Paying only shows once a week is on sale: the schedule's dates are
          still Carter's to confirm before a trip is published (lib/installments.ts), so
          they must not be public before then. Those dates are always read through
          howTheRestIsPaid, never written here.

          The all-inclusive fold lives here and not under the panel's list, which it would
          repeat (Carter, 5 November 2026: "we don't need it to say what all-inclusive
          includes twice in a row"). */}
      <section id="details" className={`scheme-light scheme-paint ${SECTION_SCROLL}`} aria-label="Good to know">
        <div className="shell grid gap-x-16 py-10 md:grid-cols-2 md:py-16">
          <Fold title={SPRING_BREAK.includedTitle}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {SPRING_BREAK.included.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Fold>
          <Fold title={SPRING_BREAK.addOnsTitle}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {SPRING_BREAK.addOns.map((addOn) => (
                <li key={addOn}>{addOn}</li>
              ))}
            </ul>
            <p className="m-0 mt-3">{SPRING_BREAK.addOnsNote}</p>
          </Fold>
          <Fold title="Getting there">
            <p className="m-0">{SPRING_BREAK.gettingThere}</p>
            <p className="m-0 mt-3">
              {SPRING_BREAK.passport} {SPRING_BREAK.age}
            </p>
            <p className="m-0 mt-3">
              <Link href="/flights" className={LINK}>
                Read the flight guide
              </Link>
            </p>
          </Fold>
          {bookable && priceFrom !== null && (
            <Fold title="How paying works">
              {deposit
                ? `${holdLineFor(openTrips, priceFrom)} ${howTheRestIsPaid(SPRING_BREAK_STARTS.filter((start) => openTrips.some((trip) => trip.startDate === start && takesDeposit(trip))))} `
                : "These days the whole price is due when you book, by card or with Klarna. "}
              Each of you books your own, so nobody fronts money for friends. The detail is in{" "}
              <Link href="/terms#payment-plan" className={LINK}>
                the Terms
              </Link>
              .
            </Fold>
          )}
        </div>
      </section>

      {/* ---- close ------------------------------------------------------------
          Carter's Punta Cana orange, used this once, as club blue closes
          /telluride. Deep espresso on it measures 4.7:1, so the copy stays short
          and at full strength, in Book rather than the lede's Light. Without a
          week to reserve, the list takes Reserve's place, on a paper block so its
          fields and consent text keep their contrast. */}
      <section
        id="join"
        data-reserve-bar-hide={bookable || undefined}
        className={`scheme-spring scheme-paint ${SECTION_SCROLL}`}
        aria-labelledby="close-heading"
      >
        <div className="shell py-16 md:py-24">
          {/* The club's name on its own color (Carter, 3 November 2026). */}
          <Logo variant="beach-club" className="mb-10 w-full max-w-[21rem] text-[--text]" />
          <Reveal>
            <h2 id="close-heading" className="t-display m-0 max-w-[14ch] text-balance text-[--text]">
              {bookable || beforeSale ? "The best week of your life" : shutTitle(trips)}
            </h2>
          </Reveal>
          {bookable ? (
            <>
              <Reveal delay={90}>
                <p className="m-0 mt-6 max-w-measure font-body text-lede font-normal leading-[1.5] text-[--text]">
                  Bring your best friends.{" "}
                  {priceFrom !== null &&
                    (deposit
                      ? `${DEPOSIT} holds your spot on an all-inclusive trip from ${formatPrice(priceFrom)} per person.`
                      : `It's all-inclusive, from ${formatPrice(priceFrom)} per person.`)}
                </p>
              </Reveal>
              <Reveal delay={180}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {openTrips.map((trip) => (
                    <Button
                      key={trip.id}
                      href={reserveHref(preview, trip, trip.tiers.length === 1 ? trip.tiers[0] : undefined)}
                      variant="primary"
                      size="lg"
                    >
                      Reserve {shortRange(trip.startDate, trip.endDate)}
                    </Button>
                  ))}
                </div>
              </Reveal>
              {/* A week at its cap points here (weekFull): the list, on its paper
                  block, under the weeks that can still be reserved. */}
              {trips.some(weekFull) && (
                <Reveal delay={180}>
                  <div id="waitlist" className="scheme-light scheme-paint mt-10 scroll-mt-20 md:mt-14">
                    <WaitlistCTA
                      tone="light"
                      placement={SPRING_BREAK_PLACEMENT}
                      heading={SPRING_BREAK.waitlistHeading}
                      body={SPRING_BREAK.waitlistBody}
                      doneHeading={SPRING_BREAK.doneHeading}
                      doneBody={SPRING_BREAK.doneBody}
                      sharePath={SPRING_BREAK_LINE.path}
                      shareText={SPRING_BREAK.shareText}
                    />
                  </div>
                </Reveal>
              )}
            </>
          ) : (
            <Reveal delay={90}>
              <div id="waitlist" className="scheme-light scheme-paint mt-8 scroll-mt-20 md:mt-12">
                <WaitlistCTA
                  tone="light"
                  placement={SPRING_BREAK_PLACEMENT}
                  heading={SPRING_BREAK.formHeading}
                  body={beforeSale ? SPRING_BREAK.formBodyBeforeBooking : SPRING_BREAK.formBody}
                  doneHeading={SPRING_BREAK.doneHeading}
                  doneBody={SPRING_BREAK.doneBody}
                  sharePath={SPRING_BREAK_LINE.path}
                  shareText={SPRING_BREAK.shareText}
                />
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );

  // Nothing to book: no bar.
  if (!bookable) return page;

  return (
    <>
      {page}
      <MobileReserveBar
        href={reserveHref(preview)}
        // Not the place, which the page already says: this stays on screen the whole way
        // down a phone, so it keeps the word in view (Carter, 5 November 2026).
        place={SPRING_BREAK.includedHeadline}
        dates={barDates(openTrips)}
        label={deposit ? `Reserve for ${DEPOSIT}` : "Reserve"}
        fromStart
        scheme="spring"
      />
    </>
  );
}

/* -- one week, at the top of the page -------------------------------------------- */

type WeekTileView = {
  key: string;
  startDate: string;
  endDate: string;
  note: string | null;
  href: string | null;
  /** At its cap: the tile leads to the waitlist (weekFull). */
  full?: boolean;
};

/**
 * A week as a block. It is a real link whenever the week can be reserved, because
 * on a phone a block that looks tappable gets tapped; the page's big Reserve stays
 * the main ask. The panel's lighter orange, with deep espresso on it above 5:1.
 */
function WeekTile({ week }: { week: WeekTileView }) {
  const inner = (
    <>
      <span className="font-display text-display-s font-medium leading-tight tracking-title text-[--text]">
        {shortRange(week.startDate, week.endDate)}
      </span>
      <span className="t-micro mt-1.5 text-[--text]">
        {weekday(week.startDate)} to {weekday(week.endDate)}
      </span>
      {week.note && <span className="t-micro mt-2 text-[--text]">{week.note}</span>}
      {week.href && (
        <span className="mt-3 font-body text-body-s text-[--text] underline underline-offset-4">Reserve</span>
      )}
    </>
  );
  const box = "flex h-full flex-col bg-[--surface-raised] p-4";
  return (
    <li>
      {week.full ? (
        <a href="#waitlist" className={`${box} no-underline`}>
          {inner}
        </a>
      ) : week.href ? (
        <Link href={week.href} className={`${box} no-underline`}>
          {inner}
        </Link>
      ) : (
        <div className={box}>{inner}</div>
      )}
    </li>
  );
}

/* -- one package ------------------------------------------------------------------ */

/** Whole class names, because Tailwind only finds what is written out. */
const ROW_COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * A package: its room (a photograph once there is one, the typographic panel until
 * then), its name and price, what it includes, and each week it is on. The panel
 * is the `card` size, the only one that does not print The Peaks' name.
 */
function RoomCard({ option, wide, weeks }: { option: PackageOption; wide: boolean; weeks: WeekView[] }) {
  const { room } = option;
  const photo = room?.photos[0] ?? null;
  const price = packagePrice(option);

  return (
    <li
      className={
        wide
          ? "grid bg-[--surface-raised] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
          : "flex w-[82%] max-w-[22rem] shrink-0 snap-start flex-col bg-[--surface-raised] sm:w-[46%] lg:w-auto lg:max-w-none"
      }
    >
      {photo ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-[--surface-inset] lg:aspect-auto lg:min-h-full">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            // Wide, the card is taller than the photograph is at a third of the page, so
            // the picture is cropped at the sides and has to be fetched larger than its box.
            sizes={wide ? "(min-width: 1024px) 44vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 46vw, 82vw"}
            quality={85}
            className="object-cover"
          />
        </div>
      ) : room ? (
        <RoomPanel room={room} size="card" />
      ) : null}

      <div className={`flex flex-1 flex-col p-5 ${wide ? "md:p-8" : ""}`}>
        <h3 className="m-0 font-display text-display-s font-medium leading-tight tracking-title text-[--text]">
          {option.label}
        </h3>
        {option.description && (
          <p className="m-0 mt-1 font-body text-body-s leading-[1.5] text-[--text-secondary]">{option.description}</p>
        )}

        {price && (
          <p className="m-0 mt-4 flex flex-col">
            <span className="t-micro text-[--text-secondary]">{price.from ? "All-inclusive from" : "Per person, all-inclusive"}</span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-display-m font-medium leading-none tracking-title text-[--text]">
                {price.price}
              </span>
              {price.from && <span className="font-body text-body-s text-[--text-secondary]">per person</span>}
            </span>
          </p>
        )}

        {/* With one package this is the panel's list again, so only more than one shows it. */}
        {!wide && option.inclusions.length > 0 && (
          <ul className="m-0 mt-5 grid list-none gap-2 p-0">
            {option.inclusions.map((item) => (
              <li key={item} className="flex gap-3 font-body text-body-s leading-[1.5] text-[--text]">
                <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 bg-[--text]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Pushed to the foot, so Reserve lines up across the cards from lg. */}
        <ul className={`m-0 mt-auto list-none gap-2 p-0 pt-5 ${wide ? "grid sm:grid-cols-2" : "flex flex-col"}`}>
          {weeks.map((week) => (
            <WeekRow key={week.key} week={week} />
          ))}
        </ul>

        {room && room.photos.length > 1 && (
          <div className="mt-3">
            <RoomPhotosButton photos={room.photos} title={room.title} />
          </div>
        )}
      </div>
    </li>
  );
}

/** One week inside a package: the dates, its price, how it stands, and its own Reserve. */
function WeekRow({ week }: { week: WeekView }) {
  return (
    <li className="flex flex-col bg-[--surface] p-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-body font-medium text-[--text]">
          {formatDateRange(week.startDate, week.endDate)}
        </span>
        {week.price && (
          <span className="font-display text-body font-medium tabular-nums text-[--text]">{week.price}</span>
        )}
      </div>
      <p className="t-micro m-0 mt-1.5 text-[--text-secondary]">
        {weekday(week.startDate)} to {weekday(week.endDate)}
        {week.note && `, ${week.note}`}
      </p>
      {week.full && (
        <a href="#waitlist" className="mt-3 font-body text-body-s text-[--text] underline underline-offset-4">
          {SPRING_BREAK.weekFull}
        </a>
      )}
      {week.href && (
        <div className="mt-3">
          <Button
            href={week.href}
            variant="primary"
            size="md"
            block
            aria-label={`${week.reserve}, ${formatDateRange(week.startDate, week.endDate)}`}
          >
            {week.reserve}
          </Button>
        </div>
      )}
    </li>
  );
}
