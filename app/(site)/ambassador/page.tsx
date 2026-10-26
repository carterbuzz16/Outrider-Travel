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
 * and is laid out for a phone first. Linked from the nav ("Ambassadors"), the
 * footer and the sitemap since 26 October 2026.
 *
 * Carter's brief for it: at most two colors on any one surface, no
 * gradients, capital headlines, short plain copy, no exclamation marks. It
 * first asked for Ski Club blue as the main surface; on 26 October 2026
 * Carter dropped that ("it's kind of an any season ambassador program so
 * doesn't have to match ski"), so the page is the core palette only, with no
 * club blue anywhere on it:
 *   - the masthead is one photograph with the headline set on it. Its scrim
 *     is a single flat wash, not the fades the other mastheads use;
 *   - the subhead and the button sit right under it on paper (small text
 *     goes on solid ground, never on the picture), and that one paper ground
 *     carries where we go and what you get, each in a warm gray block;
 *   - "Who we're looking for" is one espresso band, the beat before the ask.
 *     It holds no control, because a button on espresso is club blue;
 *   - the form is on warm gray, the book's single-moment panel. Its scheme
 *     (.scheme-stone) makes espresso the accent, so focus and the sent seal
 *     stay off blue too.
 * Espresso on paper is 11:1, paper on espresso the same, and on warm gray the
 * secondary text is 5.4:1 (globals.css, .scheme-stone).
 *
 * Polished 26 October 2026 ("to the point and simple, but sleek"): every
 * section shares one grid, heading left and content right from md, so the
 * page reads as one system rather than four stacked blocks.
 *
 * The program's terms stay off the page: "Full details are shared once
 * you're selected."
 */

const HEADING =
  "m-0 font-display text-display-l font-extrabold uppercase leading-[0.95] tracking-display text-[--text]";

// The one grid every section sits on: heading left, content right from md.
const GRID = "grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-16";

// A solid panel for the pitch's text (Carter, 26 October 2026: copy set loose
// on the page was "hard to read", put it "in a block"). Warm gray through
// .scheme-stone rather than a bare background, so the text tiers inside are
// the stone ones: espresso at 8:1, and secondary #564E48 at 5.4:1 where
// taupe would fall to 3.9:1. Square, as every panel in the brand book is.
const BLOCK = "scheme-stone scheme-paint p-6 sm:p-9 lg:p-12";

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
        <div className="scheme-light scheme-paint">
          {/* Above the fold on a phone, so plain rather than in a Reveal. */}
          <section className="shell flex flex-col gap-7 pb-20 pt-8 md:flex-row md:items-end md:justify-between md:gap-16 md:pb-28 md:pt-12">
            <p className="m-0 max-w-[30ch] font-body text-lede font-medium leading-snug text-[--text]">
              {AMBASSADOR.subhead}
            </p>
            <div className="shrink-0">
              <Button href="#apply" variant="primary" size="lg" className="min-w-[10rem]">
                {AMBASSADOR.apply}
              </Button>
            </div>
          </section>

          <section className="shell pb-20 md:pb-28" aria-labelledby="ambassador-about">
            <div className={GRID}>
              <h2 id="ambassador-about" className={HEADING}>
                {AMBASSADOR.aboutTitle}
              </h2>
              <Reveal delay={80}>
                <div className={BLOCK}>
                  <div className="flex flex-col gap-4 text-pretty">
                    {AMBASSADOR.about.map((paragraph, i) =>
                      // The two lines are the voice, set at subhead size; the
                      // last is the one hard fact (where, when), at text size.
                      i === AMBASSADOR.about.length - 1 ? (
                        <p key={paragraph} className="m-0 mt-2 font-body text-lede font-medium text-[--text]">
                          {paragraph}
                        </p>
                      ) : (
                        <p
                          key={paragraph}
                          className="m-0 font-display text-display-s font-medium leading-snug tracking-title text-[--text]"
                        >
                          {paragraph}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="shell pb-20 md:pb-28" aria-labelledby="ambassador-get">
            <div className={GRID}>
              <h2 id="ambassador-get" className={HEADING}>
                {AMBASSADOR.getTitle}
              </h2>
              <Reveal delay={80}>
                <div className={BLOCK}>
                  {/* Two across only where the block is wide enough for
                      "A direct line to the founders" in a half: the full
                      shell from sm, the right column again from lg. */}
                  <ul className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 sm:gap-x-10 md:grid-cols-1 lg:grid-cols-2 lg:gap-y-10">
                    {AMBASSADOR.get.map((item) => (
                      <li key={item.label}>
                        {/* The book's HEADLINE at label size: Extrabold
                            capitals, so each benefit reads as a headline,
                            and the line under it as the subhead. */}
                        <h3 className="m-0 font-display text-display-s font-extrabold uppercase leading-[1.05] tracking-display text-[--text]">
                          {item.label}
                        </h3>
                        <p className="m-0 mt-2 max-w-[30ch] text-pretty font-body text-lede text-[--text]">{item.line}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="m-0 mt-10 font-body text-body-s text-[--text-secondary]">{AMBASSADOR.getNote}</p>
                </div>
              </Reveal>
            </div>
          </section>
        </div>

        <section className="scheme-espresso scheme-paint" aria-labelledby="ambassador-who">
          <div className={`shell py-20 md:py-28 ${GRID}`}>
            <h2 id="ambassador-who" className={HEADING}>
              {AMBASSADOR.whoTitle}
            </h2>
            <Reveal delay={80}>
              <p className="m-0 max-w-[24ch] text-pretty font-display text-display-m font-medium leading-[1.15] tracking-title text-[--text]">
                {AMBASSADOR.who}
              </p>
            </Reveal>
          </div>
        </section>

        {/* scroll-mt clears the fixed nav when APPLY jumps here. */}
        <section id="apply" className="scheme-stone scheme-paint scroll-mt-16" aria-labelledby="ambassador-apply">
          {/* The control rule goes from the stone scheme's 55% to 62% espresso
              for this form: a field's edge must clear 3:1, and 55% on warm
              gray measures 2.76:1; 62% is 3.23:1. Set on this inner box, not
              the section, because .scheme-stone on the same element would
              win; local, so other stone panels keep theirs. */}
          <div className={`shell py-20 md:py-28 ${GRID} [--control-rule:rgb(var(--rgb-espresso)/0.62)]`}>
            {/* Held in view beside the form on wider screens: the form is
                long enough now that the ask would otherwise scroll away. */}
            <div className="md:sticky md:top-28 md:self-start">
              <h2 id="ambassador-apply" className={HEADING}>
                {AMBASSADOR.formTitle}
              </h2>
              <p className="m-0 mt-4 font-body text-lede text-[--text-secondary]">{AMBASSADOR.formNote}</p>
            </div>
            <ApplicationForm
              submitLabel={AMBASSADOR.submit}
              receivedTitle={AMBASSADOR.receivedTitle}
              receivedBody={AMBASSADOR.receivedBody}
            />
          </div>
        </section>
      </main>
    </>
  );
}
