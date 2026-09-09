import type { Metadata } from "next";
import Image from "next/image";
import { Gallery, Reveal, SectionDivider, WaitlistCTA } from "@/components/ui";
import { UPCOMING_CATEGORIES } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Where Outrider goes and why. Telluride, Colorado: a box canyon town at 8,725 feet, 2,000 acres of terrain above it, and a free gondola between the two.",
};

/* Verified against Telluride Ski Resort's own mountain page and Colorado Ski
 * Country, September 2026. Numbers on a marketing page age, so they live here
 * in one block rather than being scattered through the prose. */
const FACTS = [
  { value: "2,000", label: "Skiable acres", note: "127 trails, 41 percent of them advanced or expert" },
  { value: "13,150 ft", label: "Summit", note: "Base at 8,725 feet, so the town itself sits high" },
  { value: "330 in", label: "Average annual snowfall", note: "San Juans catch more of it than the Front Range" },
  { value: "Free", label: "The gondola", note: "The only free transport system of its kind in North America" },
];

/* Alt text describes the photograph, not the file it is stored in: the
 * filenames in public/images/telluride are unreliable (village.jpg is a posed
 * group, powder.jpg is a hut, tomboy.jpg is a cheeseboard), so these were
 * written by looking at the images. */
const GALLERY = [
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick main street with the peaks standing behind it." },
  { src: "/images/telluride/apres.jpg", alt: "A skier turning through deep snow, spray thrown up behind." },
  { src: "/images/telluride/skiing.jpg", alt: "Gondola cabins crossing above the town and the valley." },
  { src: "/images/telluride/lift.jpg", alt: "A skier in the air off the top of a snowy pitch." },
  { src: "/images/telluride/powder.jpg", alt: "A timber hut mid-mountain with people out on the deck." },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main street at night under strung lights, the mountain behind." },
  { src: "/images/telluride/winter-town.jpg", alt: "Skis racked in rows outside at the end of the day." },
  { src: "/images/telluride/tomboy.jpg", alt: "Wine and a board of food set out by a fire." },
];

export default function DestinationsPage() {
  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Destinations</h1>
        <p className="t-lede mt-8 max-w-measure">
          We do not run a catalogue. A place earns its way onto this page by
          being worth the flight, and it only goes up once somebody has walked
          it. Today that means Telluride. It will not always mean only Telluride.
        </p>
      </header>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- Telluride ------------------------------------------------------ */}
      <section className="pt-16 md:pt-20">
        <div className="shell">
          <Reveal>
            <h2 className="t-title max-w-[18ch] text-[--text]">
              Telluride, Colorado
            </h2>
            <p className="t-lede mt-6 max-w-measure">
              A box canyon in the San Juans with one road in. The town is at
              8,725 feet and the ski area runs to 13,150, which is why the
              skiing starts where most resorts have already finished.
            </p>
          </Reveal>
        </div>

        <div className="relative mt-12 h-[46vh] min-h-[280px] w-full overflow-hidden md:mt-16 md:h-[70vh]">
          <Image
            src="/images/telluride/alpenglow.jpg"
            alt="Alpenglow on the peaks above Telluride."
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Facts, set as a row of their own so the page has something with
            weight in it between the photographs. */}
        <div className="shell py-16 md:py-20">
          <div className="grid gap-px border border-[--rule] bg-[--rule] sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact, i) => (
              <Reveal key={fact.label} delay={i * 70}>
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <p className="font-display text-display-s leading-none text-[--text]">
                    {fact.value}
                  </p>
                  <p className="t-micro text-[--accent]">{fact.label}</p>
                  <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                    {fact.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- why here ------------------------------------------------------- */}
      <section className="shell pb-16 md:pb-20">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <h2 className="t-heading text-[--accent] md:sticky md:top-32">Why here</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-7">
              <p className="font-body text-lede leading-[1.8] text-[--text]">
                Telluride is hard to get to, and that is most of the point. The
                places an hour from Denver fill up with everyone who could not
                be bothered to go further, and you can feel it in the lift line.
              </p>
              <p className="font-body text-body leading-[1.85] text-[--text]">
                The town is a few streets long, walkable end to end in fifteen
                minutes, and still a real town rather than a built resort base.
                The gondola runs between it and Mountain Village until midnight
                and costs nothing, which quietly solves the problem every ski
                trip has at eleven at night.
              </p>
              <p className="font-body text-body leading-[1.85] text-[--text]">
                Above it there are 2,000 acres and 330 inches in an average
                year. Forty one percent of the trails are advanced or expert, so
                it holds up for people who can ski, and the front side is gentle
                enough that people who cannot yet are not written off on day one.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- gallery -------------------------------------------------------- */}
      <section className="pb-16 md:pb-20">
        <div className="shell">
          <Reveal>
            <h2 className="t-heading max-w-[20ch] text-[--text]">
              The place, not the brochure
            </h2>
          </Reveal>
        </div>
        <div className="mt-10 pl-[max(1.25rem,calc((100vw-var(--shell))/2+var(--gutter)))] pr-gutter">
          <Reveal>
            <Gallery images={GALLERY} />
          </Reveal>
        </div>
      </section>

      {/* ---- getting there --------------------------------------------------- */}
      <section className="shell pb-16 md:pb-20">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <h2 className="t-heading text-[--accent] md:sticky md:top-32">Getting there</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-7">
              <p className="font-body text-body leading-[1.85] text-[--text]">
                Fly into Montrose, about 65 miles out and roughly an hour and a
                half of driving. Flights are booked separately and are not
                included in the trip price, which is the one thing we deliberately
                leave in your hands, because everyone is coming from somewhere
                different and nobody should pay for a routing that suits someone
                else.
              </p>
              <p className="font-body text-body leading-[1.85] text-[--text]">
                Ground transport from Montrose and back is arranged and included.
                You are met, and you do not sort out a ride at either end.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- what is next ---------------------------------------------------- */}
      <section className="shell pb-16 md:pb-20">
        <Reveal>
          <h2 className="t-heading max-w-[20ch] text-[--text]">Where we are looking next</h2>
        </Reveal>
        <div
          className={`mt-10 grid gap-px border border-[--rule] bg-[--rule] ${
            UPCOMING_CATEGORIES.length > 1 ? "md:grid-cols-2" : ""
          }`}
        >
          {UPCOMING_CATEGORIES.map((category, i) => (
            <Reveal key={category.name} delay={i * 80}>
              <div className="flex h-full flex-col gap-4 bg-[--surface-raised] p-6 md:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="t-subheading text-[--text]">{category.name}</h3>
                  <span className="t-micro text-[--text-muted]">{category.window}</span>
                </div>
                <p className="t-micro text-[--text-secondary]">{category.destination}</p>
                <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  {category.note}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <WaitlistCTA
        heading="Know where we go next"
        body="New destinations open to this list before they reach the site. One email when a departure is live, and nothing in between."
      />
    </main>
  );
}
