import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, HeroSlideshow, Reveal, SplitHeading, VideoBand } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { HOME } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { formatDateRange, formatPrice, getPublishedTrips, isTellurideDestination } from "@/lib/trips";

export const metadata: Metadata = pageMetadata({
  // The layout's template appends "| Outrider"; the home page is the one place
  // that should lead with the brand instead.
  title: "Outrider | College group trips: Telluride ski weeks now, spring break next",
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
   * with: college, group trips, Telluride, ski, spring break. Under 160
   * characters so it is not cut off.
   */
  description:
    "Outrider hosts small-group trips for college students: Telluride ski weeks now, spring break next. We scout it, plan it and come along. Bring your friends.",
});

// Dates and the price come from the published trips, so an admin change
// shows up within five minutes without a redeploy.
export const revalidate = 300;

/*
 * The home page, rebuilt 1 October 2026 from three research passes (see HOME
 * in lib/site-content.ts for what they found). In page order:
 *
 *   masthead    four full-resolution photographs crossfading
 *               (HeroSlideshow), the one loud line on the page, and what
 *               we are in one line
 *   The Peaks   the trip, on screen two, in facts: where, when, what's in it,
 *               from how much
 *   why         one espresso band, full width, linking to /about
 *   the year    a seasonal pair: this winter, Telluride; this spring, spring
 *               break, each a photograph
 *   the night   the town at night, moving, and Reserve
 *
 * Extrabold capitals once, in the film. Every other heading is the Medium
 * title in sentence case, and grows in letter by letter (SplitHeading).
 * Panels run edge to edge; no boxes, no hairlines, about seventy words.
 */

/*
 * The masthead photographs (Carter, 1 October 2026: "three or four photos
 * that cycle through, the high-quality, good ones" rather than the blurry
 * reel). Full-resolution sources from his Telluride set, made 3200 wide.
 * First is the LCP image.
 */
const HERO_SLIDES = [
  {
    src: "/images/home/alpenglow-peaks.jpg",
    alt: "Sunset light turning the snowy San Juan peaks orange and pink above shadowed slopes.",
    position: "50% 40%",
    mobilePosition: "58% 40%",
  },
  {
    src: "/images/home/skiers-gondola.jpg",
    alt: "Three skiers standing at the top of the gondola, looking out over the valley and the snowy San Juans.",
    position: "58% 55%",
    // The three skiers sit left of centre; a phone's tall frame keeps them.
    mobilePosition: "35% 55%",
  },
  {
    src: "/images/home/golden-ridge.jpg",
    alt: "Low sun on frosted pines and a ridge of ski runs, storm clouds over the San Juans.",
    position: "35% 50%",
    mobilePosition: "30% 50%",
  },
  {
    src: "/images/home/village-dusk.jpg",
    alt: "Mountain Village lit up at dusk below the ski runs, snowmaking plumes on the slopes.",
    position: "40% 55%",
    mobilePosition: "45% 55%",
  },
];

const LINK =
  "t-label inline-flex items-center gap-2 text-[--text] underline decoration-1 underline-offset-[6px] transition-colors duration-fast hover:text-[--accent]";

type Trips = Awaited<ReturnType<typeof getPublishedTrips>>;

/** "Dec 14–18 or Jan 4–8", from the published Telluride departures. */
function tellurideDates(trips: Trips): string | null {
  const ranges = trips.map((trip) => formatDateRange(trip.startDate, trip.endDate).replace(/, \d{4}$/, ""));
  return ranges.length > 0 ? ranges.join(" or ") : null;
}

export default async function HomePage() {
  const telluride = (await getPublishedTrips()).filter(
    (trip) => isTellurideDestination(trip.destination) && trip.status !== "soldOut",
  );
  const dates = tellurideDates(telluride);
  const priceFrom = Math.min(...telluride.map((trip) => trip.priceFrom).filter((p) => p > 0));

  return (
    <>
      {/* ---- masthead -----------------------------------------------------------
          Four full-resolution photographs crossfading, each easing closer
          (HeroSlideshow). They replaced a cut-together video reel the same
          day, which Carter found blurry. A light wash over the
          whole frame and a deeper fade at the foot carry the words, which
          stay to the bottom left and to a handful. Above the fold: no Reveal;
          the headline plays its letters on load, with a CSS failsafe. */}
      <section
        className="scheme-espresso relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep]"
        aria-labelledby="home-headline"
      >
        <div className="absolute inset-0 -z-10">
          <HeroSlideshow slides={HERO_SLIDES} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(31_26_23_/_0.18)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[rgb(42_35_32_/_0.55)] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[64%] bg-gradient-to-t from-[rgb(31_26_23_/_0.88)] via-[rgb(31_26_23_/_0.45)] to-transparent"
        />
        {/* Behind the words from the left too: the reel has snow-bright cuts
            (toned down in the reel itself as well), and the headline has to
            hold 3:1 on every one of them. */}
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
            <Button href="/telluride" variant="primary" size="lg">
              See the trip
            </Button>
          </div>
        </div>
      </section>

      <main className="scheme-light scheme-paint">
        {/* ---- The Peaks -------------------------------------------------------
            Screen two is the trip, in facts. The hotel by name, the dates, four
            short lines of what's in it and the price from the database. */}
        <section className="shell py-20 md:py-28" aria-labelledby="peaks-heading">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-16 lg:gap-24">
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden bg-[--surface-inset]">
                <Image
                  src="/images/peaks/peaks-exterior-night.jpg"
                  alt="The Peaks Resort from above on a winter night, its windows lit and the heated outdoor pool glowing, with snowy peaks behind."
                  fill
                  sizes="(min-width: 768px) 52vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <div>
              {dates && <p className="t-label text-[--text-secondary]">Telluride, {dates}</p>}
              <SplitHeading id="peaks-heading" text={HOME.peaks.title} className="t-title mt-5 max-w-[14ch] text-[--text]" />
              <Reveal delay={120}>
                <ul className="m-0 mt-8 flex list-none flex-col gap-2.5 p-0">
                  {HOME.peaks.lines.map((line) => (
                    <li key={line} className="font-body text-lede leading-snug text-[--text-secondary]">
                      {line}
                    </li>
                  ))}
                </ul>
                {Number.isFinite(priceFrom) && (
                  <p className="m-0 mt-8 flex items-baseline gap-2">
                    <span className="t-micro text-[--text-secondary]">From</span>
                    <span className="font-display text-display-s font-medium tracking-title text-[--text]">
                      {formatPrice(priceFrom)}
                    </span>
                    <span className="font-body text-body-s text-[--text-secondary]">per person</span>
                  </p>
                )}
                <div className="mt-8">
                  <Link href="/telluride" className={LINK}>
                    See the trip <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

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

        {/* ---- the year -----------------------------------------------------------
            A seasonal pair, edge to edge (Surf Lodge closes on "Summer in
            Montauk / Winter in Aspen"), each a photograph: friends in the
            snow, and a palm over a pink tower for spring break, whose way in
            is the list. */}
        <section className="grid md:grid-cols-2" aria-label="This winter and this spring">
          <Link
            href="/telluride"
            className="scheme-espresso group relative isolate flex min-h-[72svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] no-underline md:min-h-[80svh]"
          >
            <Image
              src="/images/people/friends-snow-throw.jpg"
              alt="Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow."
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[78%] bg-gradient-to-t from-[rgb(31_26_23_/_0.92)] via-[rgb(31_26_23_/_0.68)] to-transparent"
            />
            <div className="p-8 md:p-12">
              <p className="t-label text-[--text]">{HOME.winter.label}</p>
              <h2 className="t-title mt-3 text-[--text]">{HOME.winter.title}</h2>
              <span className={`${LINK} mt-6`}>
                See the trip <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
          </Link>
          {/* Spring break: Carter's pick of photograph (palm-tower.jpg,
              Unsplash, see public/images/spring/CREDITS.md). No destination is
              announced, so nothing here names a place. It opens the spring
              break door to the list, /spring-break. */}
          <Link
            href="/spring-break"
            className="scheme-espresso group relative isolate flex min-h-[72svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] no-underline md:min-h-[80svh]"
          >
            <Image
              src="/images/spring/palm-tower.jpg"
              alt="A palm tree arching over a pink Mediterranean-style tower against a bright, cloudy sky."
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              style={{ objectPosition: "50% 42%" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[78%] bg-gradient-to-t from-[rgb(31_26_23_/_0.92)] via-[rgb(31_26_23_/_0.68)] to-transparent"
            />
            <div className="p-8 md:p-12">
              <p className="t-label text-[--text]">{HOME.spring.label}</p>
              <h2 className="t-title mt-3 text-[--text]">{HOME.spring.title}</h2>
              <p className="t-lede m-0 mt-3 text-[--text]">{HOME.spring.line}</p>
              <span className={`${LINK} mt-6`}>
                Join the list <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
          </Link>
        </section>

        {/* ---- the night -------------------------------------------------------------
            The town at night, moving, and the way to book. */}
        <VideoBand
          poster="/images/home/valley-dusk.jpg"
          position="50% 60%"
          alt="The valley at dusk below snowy peaks, the lights of town coming on and mist low over the trees."
        >
          <div className="shell pt-24 md:pt-32">
            <SplitHeading text={HOME.closing} className="t-title max-w-[14ch] text-[--text]" />
            <div className="mt-8">
              <Button href={BOOKINGS_OPEN ? "/bookings/new" : "/telluride"} variant="primary" size="lg">
                {BOOKINGS_OPEN ? "Reserve your spot" : "See the trip"}
              </Button>
            </div>
          </div>
        </VideoBand>
      </main>
    </>
  );
}
