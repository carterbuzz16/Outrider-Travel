import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import SectionNav from "@/components/SectionNav";
import { Button, Gallery, Reveal, WaitlistCTA } from "@/components/ui";
import { SPRING_BREAK, SPRING_BREAK_WHEN, TELLURIDE_FACTS } from "@/lib/site-content";

export const metadata: Metadata = pageMetadata({
  title: "Destinations: where Outrider goes",
  path: "/destinations",
  description:
    "Where Outrider takes college groups: Telluride, Colorado, a box canyon town at 8,725 feet, and Punta Cana, a brand new beach resort up the coast in Miches.",
});

/* Alt text describes the photograph, not the file it is stored in: the
 * filenames in public/images/telluride are unreliable (village.jpg is a posed
 * group, powder.jpg is a hut, tomboy.jpg is a cheeseboard), so these were
 * written by looking at the images. */
const GALLERY = [
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick Main Street and clock tower, a snow-covered peak rising straight up behind." },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines." },
  { src: "/images/telluride/skiing.jpg", alt: "A skier carving a groomed run high above the town, a gondola cabin passing overhead." },
  { src: "/images/telluride/lift.jpg", alt: "A skier in the air off the top of a snowy pitch." },
  { src: "/images/people/friends-slopeside.jpg", alt: "Three friends on the slope in falling snow, one on his knees cheering, a chairlift behind them." },
  { src: "/images/telluride/powder.jpg", alt: "Skiers on the sunny deck outside the old timber saloon at Gorrono Ranch, mid-mountain." },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis and snowboards racked outside Gorrono Ranch, red chairs out on the snow and the San Juans behind." },
  { src: "/images/people/chairlift-dusk.jpg", alt: "Three friends riding a chairlift up a lit run at dusk, between dark pines." },
  { src: "/images/telluride/tomboy.jpg", alt: "Wine and a board of food set out by a fire." },
];

/*
 * Punta Cana's facts, in the same four cells as Telluride's (3 November 2026).
 * Everything is from SPRING_BREAK and Carter's note to trip leads; add to that
 * constant rather than here.
 *
 * The photographs are the resort's own, listed in SPRING_BREAK.
 */
const PUNTA_CANA_FACTS = [
  { value: SPRING_BREAK.property.name, label: "The hotel", note: `${SPRING_BREAK.property.brand}, opened in June 2025` },
  { value: "All-inclusive", label: "On Playa Esmeralda", note: "Right on the beach, with kayaks and paddleboards" },
  { value: "1.5 hours", label: "Up the coast", note: "From the Punta Cana airport, with transfers both ways" },
  { value: "4 nights", label: "Two to a room", note: SPRING_BREAK_WHEN },
];

/** Fixed site nav (h-16, md:h-20) plus the sticky section row (h-14). */
const SECTION_SCROLL = "scroll-mt-[7.5rem] md:scroll-mt-[8.5rem]";

/** A row of four: large value, small label, a line of detail. */
function FactRow({ facts }: { facts: { value: string; label: string; note: string }[] }) {
  return (
    <div className="shell py-16 md:py-20">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 70}>
            <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
              <p className="font-display font-medium text-display-s leading-none text-[--text]">{fact.value}</p>
              <p className="t-micro text-[--accent]">{fact.label}</p>
              <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">{fact.note}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export default function DestinationsPage() {
  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Places worth the flight</h1>
        <p className="t-lede mt-8 max-w-measure">
          Telluride for ski, Punta Cana for spring break. One great hotel in
          each, with the whole group under its roof.
        </p>
      </header>

      <SectionNav
        links={[
          { href: "#telluride", label: "Telluride" },
          { href: "#punta-cana", label: "Punta Cana" },
        ]}
      />

      {/* ---- Telluride ------------------------------------------------------ */}
      <div id="telluride" className={SECTION_SCROLL}>
        <section className="pt-16 md:pt-20">
          <div className="shell">
            {/* Above the fold, so it renders plainly. */}
            <div>
              <h2 className="t-title max-w-[18ch] text-[--text]">Telluride, Colorado</h2>
              <p className="t-lede mt-6 max-w-measure">
                A box canyon in the San Juans with one road in. The town sits at
                8,725 feet and the terrain tops out at 13,150, so the day starts
                high and the views only get bigger.
              </p>
              <div className="mt-8">
                <Button href="/telluride" variant="secondary">
                  See the Telluride trip
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mt-12 h-[46vh] min-h-[280px] w-full overflow-hidden md:mt-16 md:h-[70vh]">
            <Image
              src="/images/telluride/alpenglow.jpg"
              alt="Pink alpenglow over the snow-covered San Juan peaks, with ski runs cut through dark forest below."
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Facts, set as a row of their own so the page has something with
              weight in it between the photographs. */}
          <FactRow facts={TELLURIDE_FACTS} />
        </section>

        {/* ---- why here ------------------------------------------------------- */}
        <section className="shell py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
            <Reveal>
              <h3 className="t-heading text-[--accent] md:sticky md:top-32">Why we picked Telluride</h3>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex flex-col gap-7">
                <p className="font-body text-lede leading-[1.8] text-[--text]">
                  Telluride takes a little more effort to reach. Peaks rise on
                  three sides of town, the gondola swings overhead, and by the
                  second day you&rsquo;re waving at the same faces on Main Street.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  The town is a few streets long, and you can walk it end to end in
                  fifteen minutes. It&rsquo;s an old mining town with brick
                  storefronts and a real Main Street. The free gondola runs up to
                  Mountain Village until midnight, so dinner downtown and the ride
                  home afterwards are both easy.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Up top there are more than 2,000 acres and about 280 inches of
                  snow in an average year. Forty-one percent of the trails are advanced or
                  expert, so strong skiers and riders have plenty to chase, and the
                  front side is gentle enough to give a first timer a great day one.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---- gallery -------------------------------------------------------- */}
        <section className="py-16 md:py-20">
          <div className="shell">
            <Reveal>
              <h3 className="t-heading max-w-[20ch] text-[--text]">A look around town</h3>
            </Reveal>
          </div>
          {/* 100% rather than 100vw: 100vw includes the scrollbar, which pushed
              the track about 7px right of the heading above it. This lines the
              first photograph up with the rest of the page and still lets the
              track bleed off the right edge. */}
          <div className="mt-10 pl-[max(1.25rem,calc((100%-var(--shell))/2+var(--gutter)))] pr-gutter">
            <Reveal>
              <Gallery images={GALLERY} label="Telluride photographs" autoplay />
            </Reveal>
          </div>
        </section>

        {/* ---- getting there --------------------------------------------------- */}
        <section className="shell py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
            <Reveal>
              <h3 className="t-heading text-[--accent] md:sticky md:top-32">Getting to Telluride</h3>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex flex-col gap-7">
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Fly into Montrose, about 65 miles out and roughly an hour and a
                  half of driving. Flights are booked separately and aren&rsquo;t
                  in the trip price. That&rsquo;s the one thing we leave in your
                  hands, since everyone is flying in from somewhere different and
                  should get the routing that works for them.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Ground transport from Montrose and back is arranged and included.
                  We meet you at the airport, drive you up the canyon, and bring
                  you back at the end.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/* ---- Punta Cana -----------------------------------------------------
          The same block as Telluride's, on stone so the two places read apart
          without a rule. "Punta Cana" is the headline and "an hour and a half up
          the coast" stays right next to it, so nobody expects the Punta Cana
          hotel strip (see the note on SPRING_BREAK). */}
      <div id="punta-cana" className={`scheme-stone scheme-paint ${SECTION_SCROLL}`}>
        <section className="pt-16 md:pt-20">
          <div className="shell">
            <h2 className="t-title max-w-[18ch] text-[--text]">Punta Cana, Dominican Republic</h2>
            <p className="t-lede mt-6 max-w-measure">
              We stay at Zemi Miches, an hour and a half up the coast from Punta
              Cana. Brand new and secluded, right on Playa Esmeralda.
            </p>
            <div className="mt-8">
              <Button href="/spring-break" variant="secondary">
                See the spring break trip
              </Button>
            </div>
          </div>

          <div className="relative mt-12 h-[46vh] min-h-[280px] w-full overflow-hidden md:mt-16 md:h-[70vh]">
            <Image
              src="/images/spring/zemi-aerial.jpg"
              alt="Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind."
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "50% 78%" }}
            />
          </div>

          <FactRow facts={PUNTA_CANA_FACTS} />

          <div className="pb-4 pl-[max(1.25rem,calc((100%-var(--shell))/2+var(--gutter)))] pr-gutter">
            <Reveal>
              <Gallery images={SPRING_BREAK.gallery} label="Photographs of Zemi Miches" belowFold />
            </Reveal>
          </div>
        </section>

        <section className="shell py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
            <Reveal>
              <h3 className="t-heading text-[--accent] md:sticky md:top-32">Why we picked Miches</h3>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex flex-col gap-7">
                <p className="font-body text-lede leading-[1.8] text-[--text]">
                  It&rsquo;s secluded: a quiet beach, no crowds, and a resort that
                  only opened in June 2025.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Zemi Miches is a Hilton Curio Collection resort, all-inclusive and
                  right on Playa Esmeralda. There are five restaurants and six bars and
                  lounges, including a cigar lounge and a swim-up bar, and kayaks and
                  paddleboards on the beach.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  If you want more, there are ATV tours into the mountains, private
                  catamaran days and the spa. Those cost extra, and we can help you
                  book them.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="shell pb-20 pt-16 md:pb-28 md:pt-20">
          <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
            <Reveal>
              <h3 className="t-heading text-[--accent] md:sticky md:top-32">Getting to Miches</h3>
            </Reveal>
            <Reveal delay={80}>
              <div className="flex flex-col gap-7">
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Fly into Punta Cana (PUJ). Flights aren&rsquo;t in the trip price.
                  Everyone books their own, since everyone is flying in from
                  somewhere different.
                </p>
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  Airport transfers are included, both ways: from Punta Cana up the
                  coast to the resort, an hour and a half, and back at the end.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      <WaitlistCTA
        id="waitlist"
        placement="destinations"
        heading="Be first on the next one"
        body="New places go to this list before they reach the site. You hear where we're going next before anyone else does."
      />
    </main>
  );
}
