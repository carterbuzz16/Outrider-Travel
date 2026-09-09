import type { Metadata } from "next";
import {
  Reveal,
  SectionDivider,
  WaitlistCTA,
  cellGridClass,
  cellSpanClass,
} from "@/components/ui";
import { UPCOMING_CATEGORIES } from "@/lib/site-content";
import { formatDateRange, formatPrice, getPublishedTrips } from "@/lib/trips";

export const metadata: Metadata = {
  title: "Join the list",
  description:
    "Outrider departures open to this list before they go on sale. One email when that happens, nothing else.",
};

export const revalidate = 300;

/**
 * The link to hand out.
 *
 * Exists because the waitlist otherwise only appears partway down two other
 * pages, which is no use in an Instagram bio or a text message. Everything here
 * points at one action, so somebody arriving from a link is not asked to scroll
 * past the case for the company before they can act on it.
 */
export default async function WaitlistPage() {
  const trips = await getPublishedTrips();

  /* The grid paints its own rule colour through the gaps, so an odd number of
   * cells leaves a flat grey rectangle where the missing one would be. The
   * last card spans the row instead. */
  const cellCount = trips.length + UPCOMING_CATEGORIES.length;
  const lastSpans = cellCount % 2 === 1;

  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Join the list</h1>
        <p className="t-lede mt-8 max-w-measure">
          Departures open to this list before they reach the site. One email when
          that happens, and nothing in between.
        </p>
      </header>

      <SectionDivider variant="rule" className="shell" />

      <section className="shell py-14 md:py-16">
        <Reveal>
          <WaitlistCTA
            id="waitlist"
            tone="light"
            heading="Be first to know"
            body="Give us an address and you will hear before anyone else does. You can leave at any time, with one click, from any message we send."
          />
        </Reveal>
      </section>

      {/* What they are actually joining for. Dates and prices are real and
          already published, so this is not a promise of something vague. */}
      {trips.length > 0 && (
        <section className="shell pb-16 md:pb-20">
          <Reveal>
            <h2 className="t-heading max-w-[20ch] text-[--text]">What is coming</h2>
          </Reveal>
          <div className={cellGridClass(cellCount, "mt-10")}>
            {trips.map((trip, i) => (
              <Reveal key={trip.id} delay={i * 80}>
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <p className="t-micro text-[--text-secondary]">{trip.destination}</p>
                  <h3 className="t-subheading text-[--text]">{trip.name}</h3>
                  <p className="t-micro text-[--text-muted]">
                    {formatDateRange(trip.startDate, trip.endDate)} · From{" "}
                    {formatPrice(trip.priceFrom)}
                  </p>
                </div>
              </Reveal>
            ))}
            {UPCOMING_CATEGORIES.map((category, i) => (
              <Reveal
                key={category.name}
                delay={(trips.length + i) * 80}
                className={cellSpanClass(trips.length + i, cellCount)}
              >
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <p className="t-micro text-[--text-secondary]">{category.destination}</p>
                  <h3 className="t-subheading text-[--text]">{category.name}</h3>
                  <p className="t-micro text-[--text-muted]">{category.window}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
