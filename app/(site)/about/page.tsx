import type { Metadata } from "next";
import Image from "next/image";
import { Button, ComparisonTable, HeroSlideshow, Plate, Reveal } from "@/components/ui";
import SectionNav, { type SectionLink } from "@/components/SectionNav";
import { pageMetadata } from "@/lib/metadata";
import { ABOUT_DIFFERENCES, FOUNDER, ORIGIN, PARTNER } from "@/lib/site-content";

export const metadata: Metadata = pageMetadata({
  title: "About",
  path: "/about",
  description:
    "Meet Outrider, the small-group trip company for college students. An outrider rides ahead to scout the way, and that's how we plan every trip we host.",
  shareTitle: "Why Outrider | College group trips, hosted",
});

/*
 * /about, rebuilt 1 October 2026. Carter found the old page hard to read and
 * hard to navigate (a title, one tall photograph, a wall of small type, then a
 * dense table), and said its main job is to show why Outrider is better than
 * the usual college trip. So, in page order:
 *
 *   masthead      the village in alpenglow, with "We go first" in the brand
 *                 book's Extrabold capitals: what the name means
 *   Why us        five reasons, each a big headline, two sentences and a
 *                 photograph, alternating sides (#difference)
 *   Side by side  the big college trip companies against us, row by row, Outrider's answer
 *                 in a Ski Club blue panel (#compare)
 *   Our story     Carter, his reason, and the bio folded (#story)
 *   Partners      Chptr (#partner)
 *
 * A sticky row of section links under the masthead, as on /telluride, so any
 * part of the page is one tap away. No hairlines anywhere (.site-quiet).
 */

/** Fixed site nav (h-16, md:h-20) plus the sticky section row (h-14). */
const SECTION_SCROLL = "scroll-mt-[7.5rem] md:scroll-mt-[8.5rem]";

const DISPLAY = "font-display font-extrabold uppercase leading-[0.92] tracking-display text-[--text]";

export default function AboutPage() {
  const hasFounderStory = FOUNDER.bio.length > 0 && Boolean(FOUNDER.name);
  const hasPartnerCopy = PARTNER.confirmed && PARTNER.body.length > 0;

  const sections: SectionLink[] = [
    { href: "#difference", label: "Why us" },
    { href: "#compare", label: "Side by side" },
    ...(hasFounderStory ? [{ href: "#story" as const, label: "Our story" }] : []),
    ...(hasPartnerCopy ? [{ href: "#partner" as const, label: "Partners" }] : []),
  ];

  return (
    <main className="scheme-light scheme-paint">
      {/* ---- masthead -------------------------------------------------------
          One full-resolution photograph, the village in alpenglow, easing
          slowly closer (HeroSlideshow). It replaced a 1600-wide video clip
          that Carter found blurry (1 October 2026). Full-bleed under the
          transparent nav, with
          the words on the dark foot of the frame. Two fades and no even scrim,
          as on /telluride. Above the fold, so nothing is wrapped in Reveal. */}
      <header className="scheme-espresso relative isolate flex min-h-[78svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep] md:min-h-[88svh]">
        <div className="absolute inset-0 -z-10">
          <HeroSlideshow
            slides={[
              {
                src: "/images/about/village-alpenglow.jpg",
                alt: "Mountain Village and the ski runs in alpenglow at dusk, snowy peaks behind.",
                position: "50% 45%",
              },
            ]}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[rgb(42_35_32_/_0.6)] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-gradient-to-t from-[rgb(31_26_23_/_0.9)] via-[rgb(31_26_23_/_0.55)] to-transparent"
        />
        <div className="shell pb-12 pt-40 md:pb-20">
          <p className="t-label text-[--text]">{ORIGIN.title}</p>
          <h1 className={`mt-5 max-w-[12ch] text-display-xl ${DISPLAY}`}>We go first</h1>
          <p className="mt-6 max-w-[44ch] font-body text-lede leading-[1.55] text-[--text]">{ORIGIN.lede}</p>
        </div>
      </header>

      <SectionNav links={sections} />

      {/* ---- why us -----------------------------------------------------------
          The page's main job. Each reason is one headline you can read from
          across a room, two sentences, and a photograph, alternating sides
          from md so the page has a rhythm rather than a list. */}
      <section
        id="difference"
        className={`shell ${SECTION_SCROLL} py-20 md:py-28`}
        aria-labelledby="difference-heading"
      >
        <Reveal>
          <p className="t-label text-[--text-secondary]">Why us</p>
          <h2 id="difference-heading" className={`mt-5 max-w-[14ch] text-display-l ${DISPLAY}`}>
            Why it&rsquo;s better with us
          </h2>
        </Reveal>

        <ol className="m-0 mt-14 flex list-none flex-col gap-16 p-0 md:mt-20 md:gap-28">
          {ABOUT_DIFFERENCES.map((item, i) => (
            <li key={item.title}>
              <Reveal>
                <div className="grid items-center gap-7 md:grid-cols-2 md:gap-16 lg:gap-24">
                  <div className={`relative aspect-[4/3] overflow-hidden bg-[--surface-inset] ${i % 2 === 1 ? "md:order-2" : ""}`}>
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes="(min-width: 768px) 46vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className={`m-0 max-w-[14ch] text-balance text-display-m ${DISPLAY}`}>{item.title}</h3>
                    <p className="m-0 mt-5 max-w-[44ch] font-body text-lede leading-[1.6] text-[--text-secondary]">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- side by side ------------------------------------------------------
          Espresso, the one dark panel in the body of the page, so the
          comparison reads as its own moment. */}
      <section
        id="compare"
        className={`scheme-espresso scheme-paint ${SECTION_SCROLL}`}
        aria-labelledby="compare-heading"
      >
        <div className="shell py-20 md:py-28">
          <Reveal>
            <p className="t-label text-[--text-secondary]">Side by side</p>
            <h2 id="compare-heading" className={`mt-5 max-w-[16ch] text-display-l ${DISPLAY}`}>
              Other trips, and ours
            </h2>
            <p className="t-lede mt-6 max-w-measure text-[--text-secondary]">
              Same mountain, very different week. Here&rsquo;s how the big
              college trip companies do it, and how we do.
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-12 md:mt-16">
              <ComparisonTable />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- our story ---------------------------------------------------------
          Why the company exists, in Carter's words, then who he is. His own
          sentence is pulled up large; the full bio stays folded so the
          section is a read of a minute, not five. */}
      {hasFounderStory && (
        <section id="story" className={`shell ${SECTION_SCROLL} py-20 md:py-28`} aria-labelledby="story-heading">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-start md:gap-20">
            <Reveal>
              <figure className="m-0 flex flex-col gap-5 md:sticky md:top-40">
                <Plate image={FOUNDER.portrait} ratio="aspect-[4/5]" sizes="(min-width: 768px) 40vw, 100vw" />
                <figcaption>
                  <p className="t-subheading text-[--text]">{FOUNDER.name}</p>
                  <p className="t-micro mt-2 text-[--accent]">{FOUNDER.role}</p>
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={90}>
              <div className="flex flex-col gap-8">
                <p className="t-label text-[--text-secondary]">Our story</p>
                <h2 id="story-heading" className="m-0 font-display text-display-m font-medium leading-[1.15] tracking-title text-[--text]">
                  &ldquo;{FOUNDER.pullQuote}&rdquo;
                </h2>
                {ORIGIN.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="m-0 font-body text-lede leading-[1.65] text-[--text]">
                    {paragraph}
                  </p>
                ))}
                <p className="m-0 font-body text-body leading-[1.8] text-[--text-secondary]">{FOUNDER.bio[0]}</p>

                {FOUNDER.bio.length > 1 && (
                  <details className="group">
                    <summary
                      className={[
                        "-my-2.5 flex cursor-pointer list-none items-center gap-3 py-2.5",
                        "t-label text-[--accent] transition-colors duration-fast",
                        "hover:text-[--text] [&::-webkit-details-marker]:hidden",
                      ].join(" ")}
                    >
                      <span className="group-open:hidden">Read Carter&rsquo;s story</span>
                      <span className="hidden group-open:inline">Close</span>
                      <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="mt-6 flex flex-col gap-6">
                      {FOUNDER.bio.slice(1).map((paragraph) => (
                        <p key={paragraph.slice(0, 32)} className="m-0 font-body text-body leading-[1.8] text-[--text-secondary]">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- partners ------------------------------------------------------------
          Chptr's mark on a white plate (a partner logo is not ours to
          recolor, and its COLLECTIVE band is white), beside what the
          partnership means for a chapter. Stone, so it sits apart from the
          story above it without a rule. */}
      {hasPartnerCopy && (
        <section id="partner" className={`scheme-stone scheme-paint ${SECTION_SCROLL}`} aria-labelledby="partner-heading">
          <div className="shell grid gap-10 py-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-20 md:py-24">
            <Reveal>
              <a
                href={PARTNER.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex w-full items-center justify-center bg-white px-8 py-10 md:px-10 md:py-14"
              >
                {/* The Collective lockup, trimmed to the mark itself. */}
                <Image
                  src="/images/partners/chptr-collective.png"
                  alt={`${PARTNER.name} Collective logo`}
                  width={780}
                  height={628}
                  className="h-auto w-full max-w-[220px] md:max-w-[280px]"
                />
              </a>
            </Reveal>
            <Reveal delay={90}>
              <div className="flex flex-col gap-5">
                <p className="t-label text-[--text-secondary]">{PARTNER.eyebrow}</p>
                <h2 id="partner-heading" className={`m-0 text-display-m ${DISPLAY}`}>
                  Vetted by {PARTNER.name}
                </h2>
                {PARTNER.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="m-0 max-w-measure font-body text-lede leading-[1.6] text-[--text-secondary]">
                    {paragraph}
                  </p>
                ))}
                <a
                  href={PARTNER.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="t-micro -my-2 inline-block self-start py-2 text-[--accent] no-underline transition-colors duration-fast hover:text-[--text]"
                >
                  chptr.house
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- close ---------------------------------------------------------------
          Club blue, the Ski Club tile, handing into the espresso footer. Every
          Telluride link goes to /telluride. */}
      <section className="scheme-club scheme-paint">
        <div className="shell flex flex-col items-start gap-8 py-20 md:py-28">
          <h2 className={`max-w-[16ch] text-display-l ${DISPLAY}`}>Two trips to Telluride this winter</h2>
          <p className="t-lede m-0 text-[--text-secondary]">December 14 to 18, and January 4 to 8.</p>
          <div className="flex flex-wrap gap-4">
            <Button href="/telluride" variant="primary" size="lg">
              See the trip
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Ask a question
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
