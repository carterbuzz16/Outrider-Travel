import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import Link from "next/link";
import { FaqSchema, Reveal, Stamp } from "@/components/ui";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { CONTACT, UPCOMING_CATEGORIES } from "@/lib/site-content";
import { availabilityLabel, formatDateRange, getPublishedTrips, nightCount } from "@/lib/trips";
import BoardingPass from "./BoardingPass";
import ListSignup from "./ListSignup";
import PhotoStrip from "./PhotoStrip";
import SplitFlap from "./SplitFlap";

export const metadata: Metadata = pageMetadata({
  title: "Join the list: early access to college ski trips and spring break",
  path: "/waitlist",
  description:
    "Outrider hosts small-group ski weeks and spring break trips for college students. The list hears about every trip before it goes on sale. Free to join.",
  shareTitle: "Join the Outrider list",
  ownImage: true,
});

export const revalidate = 300;

/**
 * The link to hand out.
 *
 * Exists because the waitlist otherwise only appears partway down other pages,
 * which is no use in an Instagram bio or a text message. The form is in the
 * first screen, and everything after it is there for the visitor who wants a
 * reason first: what joining gets them, what is on the board, what the place
 * looks like, and the questions people ask before handing over an address.
 *
 * This is the one page with more motion than a fade (see "Waitlist motion" in
 * globals.css). It has a single job, so a moving photograph and a live board
 * are not competing with anything.
 */

const STEPS = [
  {
    title: "Join the list",
    body: "Just your email. It's free, and it commits you to nothing.",
  },
  {
    title: "Hear it first",
    body: "When a trip opens, the list hears before the site does.",
  },
  {
    title: "Book your spot",
    body: "Put down 10% to hold it and pay the rest in two installments. Share a group code and you'll room with your friends.",
  },
];

/* Every answer here restates something the FAQ, the Terms or the welcome
 * email flow already commits to. Nothing about timing or price is promised
 * that the rest of the site does not already say. */
const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does joining cost anything, or commit me to a trip?",
    a: <>No. Joining is free and holds nothing. You hear when trips open, before they go public, and decide then.</>,
  },
  {
    q: "What will you send me?",
    a: (
      <>
        A short note now confirming you&rsquo;re on the list, then one email
        when a trip opens. Every message has a one-click unsubscribe.
      </>
    ),
  },
  {
    q: "When do trips go on sale?",
    a: BOOKINGS_OPEN ? (
      <>
        They&rsquo;re open now. Dates, packages and pricing are on the{" "}
        <Link href="/trips" className="text-[--accent] underline underline-offset-4">
          trips page
        </Link>
        .
      </>
    ) : (
      <>
        Shortly. The dates are already on the{" "}
        <Link href="/trips" className="text-[--accent] underline underline-offset-4">
          trips page
        </Link>
        , and the list hears before booking opens to everyone else.
      </>
    ),
  },
  {
    q: "Can my friends and I book together?",
    a: (
      <>
        Yes. Everyone books their own spot, and a group code keeps you together
        for rooming, so no single person is holding everyone else&rsquo;s money.
        Send them this page and they can join the list too.
      </>
    ),
  },
  {
    q: "Who is Outrider?",
    a: (
      <>
        We host small-group ski weeks and spring break trips for college
        students. One property for the whole group, everything planned before
        you land, and our team with you the whole trip.{" "}
        <Link href="/about" className="text-[--accent] underline underline-offset-4">
          Why we run it this way
        </Link>
        , or write to{" "}
        <a href={`mailto:${CONTACT.email}`} className="text-[--accent] underline underline-offset-4">
          {CONTACT.email}
        </a>
        .
      </>
    ),
  },
];

/** Stagger for the hero's CSS entrance. CSS rather than <Reveal>, because
 *  Reveal hides content until hydration and this is the first screen. */
const rise = (step: number) =>
  ({ animationDelay: `${120 + step * 110}ms` }) as React.CSSProperties;

export default async function WaitlistPage() {
  const trips = await getPublishedTrips();
  const next = trips[0];

  const board = [
    ...trips.map((trip) => ({
      key: trip.id,
      destination: trip.destination.split(",")[0],
      name: trip.name,
      when: formatDateRange(trip.startDate, trip.endDate),
      status: BOOKINGS_OPEN ? availabilityLabel(trip.status) : "List first",
      live: true,
    })),
    ...UPCOMING_CATEGORIES.map((category) => ({
      key: category.name,
      destination: category.destination.startsWith("Destination") ? "TBA" : category.destination,
      name: category.name,
      when: category.window,
      status: "Scouting",
      live: false,
    })),
  ];

  return (
    <main>
      {/* FAQ markup for the questions below, from the same array. */}
      <FaqSchema items={QUESTIONS} />

      {/* ---- hero ------------------------------------------------------------ */}
      <section
        className="scheme-espresso scheme-paint relative isolate overflow-hidden"
        aria-labelledby="waitlist-headline"
      >
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image
            src="/images/telluride/alpenglow.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="drift object-cover"
          />
          {/* Weighted to the left, where the type is, and heaviest behind the
              small print under the form. On narrow screens the text spans the
              whole frame, so the wash goes even instead. */}
          <div className="absolute inset-0 bg-[rgb(42_35_32_/_0.72)] lg:bg-transparent lg:bg-[linear-gradient(90deg,rgb(42_35_32_/_0.92)_0%,rgb(42_35_32_/_0.78)_45%,rgb(42_35_32_/_0.35)_100%)]" />
        </div>

        <div className="shell grid min-h-[100svh] items-center gap-14 pb-20 pt-32 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20 lg:pt-36">
          <div>
            <p className="t-micro text-[--text] motion-safe:animate-rise" style={rise(0)}>
              <span className="mr-3 inline-block h-px w-8 translate-y-[-0.25em] bg-[--accent] align-middle" aria-hidden="true" />
              {/* Shortened on a phone so it stays one line. */}
              <span className="hidden sm:inline">Early access · </span>Ski weeks · Spring break
            </p>
            <h1
              id="waitlist-headline"
              className="t-display mt-7 max-w-[12ch] text-[--text] motion-safe:animate-rise"
              style={rise(1)}
            >
              Hear it before campus does
            </h1>
            <p
              className="mt-8 max-w-[44ch] font-body text-lede leading-[1.7] text-[--text] motion-safe:animate-rise"
              style={rise(2)}
            >
              Outrider hosts small-group ski weeks and spring break trips for
              college students. The list hears about every trip before it
              reaches the site: one email when it opens, and nothing in between.
            </p>
            <div className="mt-10 motion-safe:animate-rise" style={rise(3)}>
              <ListSignup placement="waitlist-hero" />
            </div>
          </div>

          {next && (
            <div className="mx-auto w-full max-w-[30rem] motion-safe:animate-rise lg:mr-0" style={rise(4)}>
              <BoardingPass
                tripId={next.id}
                name={next.name}
                destination={next.destination}
                startDate={next.startDate}
                dates={formatDateRange(next.startDate, next.endDate)}
                nights={nightCount(next.startDate, next.endDate)}
              />
            </div>
          )}
        </div>
      </section>

      {/* ---- how it works ---------------------------------------------------- */}
      <section className="scheme-light scheme-paint">
        <div className="shell py-20 md:py-28">
          <Reveal>
            <span className="t-rule-label text-[--text]">How the list works</span>
            <h2 className="t-title mt-8 max-w-[18ch] text-[--text]">
              Ten seconds now, first in line later
            </h2>
          </Reveal>

          {/* Always exactly three, so a three-up grid never leaves a hole. */}
          <ol className="m-0 mt-14 grid list-none gap-px border border-[--rule] bg-[--rule] p-0 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 90} className="bg-[--surface-raised]">
                <div className="group relative flex h-full flex-col p-7 md:p-9">
                  <span className="font-display font-medium text-display-l leading-none tracking-display text-[--accent] transition-transform duration-slow ease-out group-hover:-translate-y-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="t-subheading mt-10 text-[--text]">{step.title}</h3>
                  <p className="mt-3 max-w-[34ch] font-body text-body leading-[1.7] text-[--text-secondary]">
                    {step.body}
                  </p>
                  {/* A hairline that inks across on hover: the only thing
                      the card does, and it says "this is the order". */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[--accent] transition-transform duration-slow ease-out group-hover:scale-x-100"
                  />
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- departures board ------------------------------------------------ */}
      {board.length > 0 && (
        <section className="scheme-espresso scheme-paint" aria-labelledby="board-heading">
          <div className="shell py-20 md:py-28">
            <Reveal>
              <span className="t-rule-label text-[--text]">Departures</span>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h2 id="board-heading" className="t-title max-w-[18ch] text-[--text]">
                    Where we&rsquo;re headed
                  </h2>
                </div>
                <Link
                  href="/trips"
                  className="t-label -my-2.5 py-2.5 text-[--text] underline decoration-[--rule-strong] underline-offset-[0.5em] transition-colors duration-fast hover:text-[--accent]"
                >
                  All trips
                </Link>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="mt-14 border-y border-[--rule]">
                <div
                  className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-6 border-b border-[--rule] py-4 md:grid"
                  aria-hidden="true"
                >
                  {["Destination", "Trip", "When", "Status"].map((h) => (
                    <span key={h} className="t-micro text-[--text-muted]">
                      {h}
                    </span>
                  ))}
                </div>
                <ul className="m-0 list-none p-0">
                  {board.map((row, i) => (
                    <li
                      key={row.key}
                      className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[--rule-faint] py-6 transition-colors duration-fast last:border-0 hover:bg-[--surface-raised] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)] md:items-center md:px-3 md:-mx-3"
                    >
                      <span className="col-span-2 font-display font-medium text-display-s leading-none text-[--text] md:col-span-1">
                        <SplitFlap text={row.destination} delay={i * 140} />
                      </span>
                      <span className="font-body text-body text-[--text-secondary]">{row.name}</span>
                      <span className="t-micro text-right text-[--text] md:text-left">{row.when}</span>
                      <span
                        className={[
                          "t-micro col-span-2 inline-flex items-center gap-2.5 md:col-span-1",
                          row.live ? "text-[--accent]" : "text-[--text-muted]",
                        ].join(" ")}
                      >
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                          {row.live && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50 motion-reduce:hidden" />
                          )}
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                        </span>
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- the name ---------------------------------------------------------
          The brand origin in one line, and the reason this list exists. */}
      <section className="scheme-light scheme-paint">
        <div className="shell grid items-center gap-12 py-20 md:grid-cols-[minmax(0,1fr)_auto] md:gap-20 md:py-28">
          <Reveal>
            <p className="t-title max-w-[22ch] text-[--text]">
              An outrider is the one who goes first.{" "}
              <span className="text-[--accent]">So is this list.</span>
            </p>
            <p className="t-lede mt-7 max-w-[52ch]">
              They ride ahead of the group, scout the route and have everything
              ready before anyone else arrives. The list works the same way: you
              hear before the rest of campus does.
            </p>
          </Reveal>
          <Reveal delay={120} className="justify-self-center">
            <Stamp text="Outrider · List first · Early access" spin className="w-36 text-[--text] md:w-44" />
          </Reveal>
        </div>
      </section>

      {/* ---- the place ------------------------------------------------------- */}
      <section className="scheme-light scheme-paint pb-20 md:pb-28">
        <div className="shell">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6 border-t border-[--rule] pt-20 md:pt-28">
              <h2 className="t-heading max-w-[20ch] text-[--text]">Telluride, before everyone else</h2>
              <Link
                href="/destinations"
                className="t-label -my-2.5 py-2.5 text-[--text] underline decoration-[--rule-strong] underline-offset-[0.5em] transition-colors duration-fast hover:text-[--accent]"
              >
                The destination
              </Link>
            </div>
          </Reveal>
        </div>
        <Reveal className="mt-12">
          <PhotoStrip />
        </Reveal>
      </section>

      {/* ---- questions ------------------------------------------------------- */}
      <section className="scheme-light scheme-paint">
        <div className="shell border-t border-[--rule] py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-20">
            <Reveal>
              {/* Sticky as a pair: pinning only the heading slid it over the
                  line beneath it. */}
              <div className="md:sticky md:top-32">
                <h2 className="t-heading text-[--text]">Before you sign up</h2>
                <p className="mt-5 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  The rest are on the{" "}
                  <Link href="/faq" className="text-[--accent] underline underline-offset-4">
                    full FAQ
                  </Link>
                  .
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <ul className="m-0 flex list-none flex-col border-t border-[--rule] p-0">
                {QUESTIONS.map((item) => (
                  <li key={item.q} className="border-b border-[--rule]">
                    <details className="group py-5">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 t-subheading text-[--text] transition-colors duration-fast hover:text-[--accent] [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="mt-1 shrink-0 text-[--accent] transition-transform duration-fast group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <div className="mt-4 max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]">
                        {item.a}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- close ----------------------------------------------------------- */}
      <section className="scheme-espresso scheme-paint relative isolate overflow-hidden" aria-labelledby="close-heading">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image src="/images/telluride/town-christmas.jpg" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[rgb(42_35_32_/_0.8)]" />
        </div>
        <div className="shell flex flex-col items-start gap-10 py-24 md:py-32">
          <Reveal className="w-full">
            <span className="t-rule-label text-[--text]">Before you go</span>
            <h2 id="close-heading" className="t-title mt-8 max-w-[16ch] text-[--text]">
              The list boards first
            </h2>
          </Reveal>
          <Reveal delay={90} className="w-full">
            <ListSignup placement="waitlist-close" />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
