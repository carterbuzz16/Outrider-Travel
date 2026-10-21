import type { Metadata } from "next";
import { Button, HeroSlideshow, Reveal, SplitHeading } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { AMBASSADOR } from "@/lib/site-content";
import ApplicationForm from "./ApplicationForm";

export const metadata: Metadata = pageMetadata({
  title: "Become an Outrider Ambassador",
  // The whole tab title as given; the template would make it "... | Outrider".
  absoluteTitle: true,
  path: "/ambassador",
  description:
    "Travel for free. Outrider is selecting a small team of Campus Leads and Ambassadors. Limited spots per campus.",
  // The share card is ./opengraph-image.tsx: the hero photograph and the
  // headline, because this link travels by text message.
  ownImage: true,
});

/*
 * /ambassador, 19 October 2026: the application for the Campus Lead and
 * Ambassador program. Nearly everyone arrives from a pop-up in the Chptr app
 * headed "TRAVEL FOR FREE", on a phone, so the page opens on that same line
 * and is laid out for a phone first. Not in the navigation or the sitemap yet.
 *
 * Carter's brief for it: Ski Club blue as the main surface, at most two
 * colors on any one surface, no gradients, capital headlines, short plain
 * copy, no exclamation marks. So:
 *   - the masthead is one photograph with the headline set on it. Its scrim
 *     is a single flat wash, not the fades the other mastheads use;
 *   - the subhead and the button sit right under it on club blue (small text
 *     goes on solid ground, never on the picture), and that one blue ground
 *     carries the page down to the form rather than alternating;
 *   - the form is on paper, where the fields and their errors read best.
 * Club blue with deep espresso is 6.8:1 (globals.css, .scheme-club).
 *
 * The program's terms stay off the page: "Full details are shared once
 * you're selected."
 */

const HEADING =
  "font-display text-display-l font-extrabold uppercase leading-[0.95] tracking-display text-[--text]";

export default function AmbassadorPage() {
  return (
    <>
      <section
        className="scheme-espresso relative isolate flex min-h-[62svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[78svh]"
        aria-labelledby="ambassador-headline"
      >
        <div className="absolute inset-0 -z-10">
          <HeroSlideshow
            slides={[
              {
                src: "/images/home/golden-ridge.jpg",
                alt: "Low sun on frosted pines and a ridge of ski runs, storm clouds over the San Juans.",
                position: "35% 50%",
                mobilePosition: "30% 50%",
              },
            ]}
          />
        </div>
        {/* One flat wash over the whole picture instead of the usual fades.
            Measured against the photograph's own pixels at 375 and 1024
            wide: the headline averages 6.3:1 behind its worst letter, and
            the nav's small labels 5.5:1 (golden ridge's sky is darker than
            the alpenglow shot's, which needed twice the wash for the nav). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(42_35_32_/_0.35)]" />
        <div className="shell pb-8 pt-36 md:pb-14">
          <SplitHeading
            as="h1"
            id="ambassador-headline"
            text={AMBASSADOR.headline}
            onLoad
            delay={150}
            className="max-w-[9ch] font-display text-[clamp(3.75rem,17vw,10rem)] font-extrabold uppercase leading-[0.86] tracking-display text-[--text]"
          />
        </div>
      </section>

      <main>
        <div className="scheme-club scheme-paint">
          {/* Above the fold on a phone, so plain rather than in a Reveal. */}
          <section className="shell flex flex-col gap-7 pb-16 pt-8 md:flex-row md:items-end md:justify-between md:gap-16 md:pb-24 md:pt-12">
            <p className="m-0 max-w-[30ch] font-body text-lede font-medium leading-snug text-[--text]">
              {AMBASSADOR.subhead}
            </p>
            <div className="shrink-0">
              <Button href="#apply" variant="primary" size="lg">
                {AMBASSADOR.apply}
              </Button>
            </div>
          </section>

          <section className="shell pb-16 md:pb-28" aria-labelledby="ambassador-about">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-16">
              <h2 id="ambassador-about" className={HEADING}>
                {AMBASSADOR.aboutTitle}
              </h2>
              <Reveal delay={80}>
                <div className="flex max-w-[40ch] flex-col gap-5 font-body text-lede leading-[1.5] text-[--text]">
                  {AMBASSADOR.about.map((paragraph) => (
                    <p key={paragraph} className="m-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>

          <section className="shell pb-16 md:pb-28" aria-labelledby="ambassador-get">
            <h2 id="ambassador-get" className={HEADING}>
              {AMBASSADOR.getTitle}
            </h2>
            <ul className="m-0 mt-8 grid list-none gap-8 p-0 sm:grid-cols-2 md:mt-12 md:gap-x-16 md:gap-y-12">
              {AMBASSADOR.get.map((item, i) => (
                <li key={item.label}>
                  <Reveal delay={i * 70}>
                    <p className="m-0 font-display text-display-s font-bold leading-tight tracking-title text-[--text]">
                      {item.label}
                    </p>
                    <p className="m-0 mt-2 max-w-[32ch] font-body text-body text-[--text]">{item.line}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-10 font-body text-body-s text-[--text-secondary] md:mt-14">{AMBASSADOR.getNote}</p>
          </section>

          <section className="shell pb-20 md:pb-32" aria-labelledby="ambassador-who">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-16">
              <h2 id="ambassador-who" className={HEADING}>
                {AMBASSADOR.whoTitle}
              </h2>
              <Reveal delay={80}>
                <p className="m-0 max-w-[26ch] font-display text-display-m font-medium tracking-title text-[--text]">
                  {AMBASSADOR.who}
                </p>
              </Reveal>
            </div>
          </section>
        </div>

        {/* scroll-mt clears the fixed nav when APPLY jumps here. */}
        <section id="apply" className="scheme-light scheme-paint scroll-mt-16" aria-labelledby="ambassador-apply">
          <div className="shell grid gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-16 md:py-28">
            <div>
              <h2 id="ambassador-apply" className={HEADING}>
                {AMBASSADOR.formTitle}
              </h2>
              <p className="m-0 mt-4 font-body text-lede text-[--text-secondary]">{AMBASSADOR.formNote}</p>
            </div>
            <ApplicationForm submitLabel={AMBASSADOR.submit} receivedMessage={AMBASSADOR.received} />
          </div>
        </section>
      </main>
    </>
  );
}
