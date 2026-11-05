import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, CampusMarquee, HeroSlideshow, Logo, Reveal, SplitHeading } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { HOME, SPRING_BREAK_WEEKS } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { tellurideClosed } from "@/lib/signup-deadline";
import { SKI, SPRING_BREAK_LINE, tripsOnLine, type TripLine } from "@/lib/trip-lines";
import { formatDateRange, formatPrice, getPublishedTrips } from "@/lib/trips";

export const metadata: Metadata = pageMetadata({
  // The layout's template appends "| Outrider"; the home page is the one place
  // that should lead with the brand instead.
  title: "Outrider | College group trips to Telluride and Punta Cana",
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
   * with: college, group trips, Telluride, ski, spring break, Punta Cana. Under
   * 160 characters so it is not cut off.
   */
  description:
    "Outrider hosts small-group trips for college students: ski weeks in Telluride and spring break in Punta Cana. We plan it and come along. Bring your friends.",
});

// Dates and the price come from the published trips, so an admin change
// shows up within five minutes without a redeploy.
export const revalidate = 300;

/*
 * The home page, rebuilt 1 October 2026 from three research passes (see HOME
 * in lib/site-content.ts for what they found), and again on 3 November 2026 for
 * two trips. Carter: "we do ski, spring break, etc., not just ski with spring
 * break". In page order:
 *
 *   masthead    full-resolution photographs of both places crossfading
 *               (HeroSlideshow), the one loud line on the page, and what we are
 *               in one line
 *   the trips   a seasonal pair (Surf Lodge closes on "Summer in Montauk /
 *               Winter in Aspen"), each trip's photograph over its own facts:
 *               where, when, what's in it, from how much. Same shape on both
 *               sides, so neither reads as the extra one
 *   why         one espresso band, full width, linking to /about
 *   the close   friends at a table, and Reserve
 *
 * Extrabold capitals once, in the masthead. Every other heading is the Medium
 * title in sentence case, and grows in letter by letter (SplitHeading).
 * Panels run edge to edge; no boxes, no hairlines, about ninety words.
 *
 * Each trip's facts sit on its own color, club blue for ski and Carter's Punta
 * Cana orange for spring break. Those are single panels by rule, and this is one
 * of each, side by side, so nothing alternates down the page. Neither color
 * appears anywhere else on it.
 */

/*
 * The masthead photographs (Carter, 1 October 2026: "three or four photos
 * that cycle through, the high-quality, good ones" rather than the blurry
 * reel). Telluride's are full-resolution sources from his set, made 3200 wide.
 * First is the LCP image.
 *
 * Zemi Miches is second so both places are on screen within the first few
 * seconds, and Telluride is cut to two so it does not take the masthead over.
 * zemi-aerial.jpg is the resort's own, 3200 wide since 3 November 2026.
 */
const HERO_SLIDES = [
  {
    src: "/images/home/alpenglow-peaks.jpg",
    alt: "Sunset light turning the snowy San Juan peaks orange and pink above shadowed slopes.",
    position: "50% 40%",
    mobilePosition: "58% 40%",
  },
  {
    src: "/images/spring/zemi-aerial.jpg",
    alt: "Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind.",
    // Low in the frame, for a very wide screen that has to crop height: the pools
    // are the picture, and the sky is what can go.
    position: "50% 78%",
    // A phone's tall frame keeps a narrow slice: the tall palms and the main pool.
    mobilePosition: "66% 50%",
  },
  {
    src: "/images/home/skiers-gondola.jpg",
    alt: "Three skiers standing at the top of the gondola, looking out over the valley and the snowy San Juans.",
    position: "58% 55%",
    // The three skiers sit left of centre; a phone's tall frame keeps them.
    mobilePosition: "35% 55%",
  },
];

const LINK =
  "t-label inline-flex items-center gap-2 text-[--text] underline decoration-1 underline-offset-[6px] transition-colors duration-fast hover:text-[--accent]";

type Trips = Awaited<ReturnType<typeof getPublishedTrips>>;

/** "Dec 14–18 or Jan 4–8", from a line's departures. */
function datesLine(weeks: readonly { startDate: string; endDate: string }[]): string | null {
  const ranges = weeks.map((week) => formatDateRange(week.startDate, week.endDate).replace(/, \d{4}$/, ""));
  return ranges.length > 0 ? ranges.join(" or ") : null;
}

function lowestPrice(trips: Trips): number | null {
  const prices = trips.map((trip) => trip.priceFrom).filter((price) => price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * One trip: its photograph with the season and the place set on it, its facts
 * under that on its own color. The whole column is the link. `dates` and `price`
 * drop out cleanly, because a trip that is not on sale has neither.
 */
function TripColumn({
  line,
  scheme,
  season,
  stay,
  lines,
  dates,
  price,
  image,
}: {
  line: TripLine;
  scheme: "scheme-club" | "scheme-spring";
  season: string;
  stay: string;
  lines: string[];
  dates: string | null;
  price: number | null;
  image: { src: string; alt: string; position?: string };
}) {
  return (
    <Link href={line.path} className="group flex flex-col no-underline">
      <div className="scheme-espresso relative isolate flex min-h-[48svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[50svh]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={image.position ? { objectPosition: image.position } : undefined}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[78%] bg-gradient-to-t from-[rgb(31_26_23_/_0.92)] via-[rgb(31_26_23_/_0.68)] to-transparent"
        />
        <div className="p-8 md:p-12">
          <p className="t-label text-[--text]">{season}</p>
          <SplitHeading text={line.place} className="t-title mt-3 text-[--text]" />
        </div>
      </div>
      <div className={`${scheme} scheme-paint flex flex-1 flex-col p-8 md:p-12`}>
        {/* Each panel is its club: Carter's "club-type logos" (3 November 2026). */}
        <Logo variant={line.clubLogo} width={`${16 * line.clubLogoRatio}rem`} className="mb-8 max-w-full text-[--text]" />
        <p className="t-heading m-0 text-balance text-[--text]">{stay}</p>
        {dates && <p className="t-label m-0 mt-5 text-[--text]">{dates}</p>}
        <ul className="m-0 mt-7 flex list-none flex-col gap-2 p-0">
          {lines.map((item) => (
            <li key={item} className="font-body text-lede leading-snug text-[--text]">
              {item}
            </li>
          ))}
        </ul>
        {/* Pushed to the foot so the two columns finish level, whichever has
            the longer facts or no price yet. */}
        <div className="mt-auto pt-8">
          {price !== null && (
            <p className="m-0 mb-6 flex items-baseline gap-2">
              <span className="t-micro text-[--text-secondary]">From</span>
              <span className="font-display text-display-s font-medium tracking-title text-[--text]">
                {formatPrice(price)}
              </span>
              <span className="font-body text-body-s text-[--text-secondary]">per person</span>
            </p>
          )}
          <span className={LINK}>
            See the trip <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const published = await getPublishedTrips();
  // A departure past its booking close reads soldOut (lib/trips.ts), so December
  // drops off this page on November 15 and January on December 5.
  const open = published.filter((trip) => trip.status !== "soldOut");
  const ski = tripsOnLine(open, SKI);
  const spring = tripsOnLine(open, SPRING_BREAK_LINE);

  // The clock rather than an empty list: a failed read also returns no trips, and
  // that must not tell anyone booking has closed.
  const skiDates = datesLine(ski) ?? (BOOKINGS_OPEN && tellurideClosed() ? HOME.trips.ski.closed : null);
  // Spring break's dates are announced before its trips are published, so they
  // show either way. Once a week is published the trips decide, so a week that
  // has closed is not still advertised here.
  const springDates =
    datesLine(spring) ?? (tripsOnLine(published, SPRING_BREAK_LINE).length === 0 ? datesLine(SPRING_BREAK_WEEKS) : null);

  // Nothing on sale means a Reserve button that leads nowhere.
  const canReserve = BOOKINGS_OPEN && open.length > 0;

  return (
    <>
      {/* ---- masthead -----------------------------------------------------------
          Photographs of both places crossfading, each easing closer
          (HeroSlideshow). They replaced a cut-together video reel on 1 October
          2026, which Carter found blurry. A light wash over the whole frame and
          deeper fades at the head and foot carry the words, which stay to the
          bottom left and to a handful. Above the fold: no Reveal; the headline
          plays its letters on load, with a CSS failsafe.

          Measured on the Zemi Miches slide, its pale sky and sand being the
          brightest ground here, at 1440, 1920 and a phone: the nav 5.1:1 or
          better, the headline 3.2:1 or better, the tagline 5.0:1 or better. The
          wash and the head fade were deepened on 3 November 2026 to clear that. */}
      <section
        className="scheme-espresso relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep]"
        aria-labelledby="home-headline"
      >
        <div className="absolute inset-0 -z-10">
          <HeroSlideshow slides={HERO_SLIDES} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(31_26_23_/_0.22)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[rgb(42_35_32_/_0.72)] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[64%] bg-gradient-to-t from-[rgb(31_26_23_/_0.88)] via-[rgb(31_26_23_/_0.45)] to-transparent"
        />
        {/* Behind the words from the left too: the snow and the sand are both
            bright, and the headline has to hold 3:1 on every photograph. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-[62%] bg-gradient-to-r from-[rgb(31_26_23_/_0.55)] to-transparent md:block"
        />
        <div className="shell pb-14 pt-40 md:pb-20">
          <SplitHeading
            as="h1"
            id="home-headline"
            text={HOME.headline}
            onLoad
            delay={250}
            className="max-w-[11ch] font-display text-[clamp(3rem,7.4vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-display text-[--text]"
          />
          <p className="m-0 mt-6 font-body text-lede leading-snug text-[--text]">{HOME.tagline}</p>
          <div className="mt-8">
            {/* Not /telluride: the first thing the page asks should not assume ski. */}
            <Button href="/trips" variant="primary" size="lg">
              See the trips
            </Button>
          </div>
        </div>
      </section>

      <main className="scheme-light scheme-paint">
        {/* ---- the trips -------------------------------------------------------
            Screen two is both trips, in facts: the hotel by name, the dates,
            what's in it and the price from the database. Spring's price is left
            out until its trips are published, and Telluride's dates and price
            once both weeks have closed. The grid stretches the columns, so
            their panels stay the same height either way. */}
        <section className="grid md:grid-cols-2" aria-label="The trips">
          <TripColumn
            line={SKI}
            scheme="scheme-club"
            season={HOME.trips.ski.season}
            stay={HOME.trips.ski.stay}
            lines={HOME.trips.ski.lines}
            dates={skiDates}
            price={lowestPrice(ski)}
            image={{
              src: "/images/people/friends-snow-throw.jpg",
              alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow.",
              // Their faces are in the top third; a wide frame would crop them.
              position: "50% 15%",
            }}
          />
          {/* The hotel's own photograph, in place of the palm stand-in
              (palm-tower.jpg) from before a destination was announced. The phone
              crop is the same as the masthead's, the palms and the main pool. */}
          <TripColumn
            line={SPRING_BREAK_LINE}
            scheme="scheme-spring"
            season={HOME.trips.springBreak.season}
            stay={HOME.trips.springBreak.stay}
            lines={HOME.trips.springBreak.lines}
            dates={springDates}
            price={lowestPrice(spring)}
            image={{
              src: "/images/spring/zemi-dusk.jpg",
              alt: "Zemi Miches from above at dusk: the lit pools and a big shade tree, the beach and palms, and a quiet bay with mountains behind.",
              position: "45% 60%",
            }}
          />
        </section>

        <CampusMarquee />

        {/* ---- why ----------------------------------------------------------------
            One espresso band, edge to edge: the differentiator in a line, and
            the page that proves it. */}
        <section className="scheme-espresso scheme-paint" aria-labelledby="why-heading">
          <div className="shell flex flex-col gap-8 py-20 md:flex-row md:items-end md:justify-between md:gap-16 md:py-28">
            <div>
              <SplitHeading id="why-heading" text={HOME.why.title} className="t-title max-w-[16ch] text-[--text]" />
              <Reveal delay={120}>
                <p className="t-lede m-0 mt-5 max-w-[34ch] text-[--text-secondary]">{HOME.why.line}</p>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <Link href="/about" className={LINK}>
                See why <span aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---- the close ----------------------------------------------------------
            Was the valley at dusk under "Four nights in Telluride". Friends at a
            table is true of either trip. It is built here rather than on
            VideoBand: that band's navy fade is cut for a night sky and turned
            this warm photograph to mud, so this one fades up from the foot in
            espresso, as the masthead does, and holds still. */}
        <section
          className="scheme-espresso relative isolate flex min-h-[72svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[86svh]"
          aria-labelledby="close-heading"
        >
          <Image
            src="/images/people/friends-candlelit-dinner.jpg"
            alt="A group of friends in hoodies sharing dinner at a long candlelit table in a timber dining room."
            fill
            sizes="100vw"
            quality={85}
            className="-z-10 object-cover"
            style={{ objectPosition: "50% 80%" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60%] bg-gradient-to-t from-[rgb(31_26_23_/_0.88)] via-[rgb(31_26_23_/_0.45)] to-transparent"
          />
          <div className="shell pb-14 pt-24 md:pb-20">
            <SplitHeading id="close-heading" text={HOME.closing} className="t-title max-w-[14ch] text-[--text]" />
            <div className="mt-8">
              <Button href={canReserve ? "/bookings/new" : "/trips"} variant="primary" size="lg">
                {canReserve ? "Reserve your spot" : "See the trips"}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
