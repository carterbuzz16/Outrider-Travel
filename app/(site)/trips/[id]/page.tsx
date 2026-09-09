import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Button,
  Gallery,
  Plate,
  Reveal,
  SectionDivider,
  StatusBadge,
  TierTable,
  TripSchema,
  type TierView,
} from "@/components/ui";
import { BOOKINGS_OPEN, COMING_SOON_NOTE, TRIP_DETAILS_OPEN } from "@/lib/booking-window";
import { getAppUrl } from "@/lib/site-url";
import {
  availabilityLabel,
  formatDateRange,
  formatPrice,
  getPublishedTrip,
  nightCount,
} from "@/lib/trips";

/*
 * Rendered per request rather than statically cached.
 *
 * Background, because the obvious reading is wrong: a draft or non-existent
 * trip used to answer 200 with the 404 page in the body — a soft 404. The cause
 * was not this route at all, it was an app-wide app/loading.tsx: a loading
 * boundary streams its skeleton immediately, the response commits 200, and a
 * later notFound() can no longer change the status. That file is now scoped to
 * the sections that actually want it (see app/(protected) and app/admin).
 *
 * Static generation is still avoided here for a second, independent reason:
 * with `revalidate` + generateStaticParams, Next caches the notFound() result
 * and serves it from the ISR cache as a 200 on subsequent hits. Rendering on
 * demand sidesteps that, and it also means a trip published in the admin gets a
 * page immediately instead of at the next deploy. The cost is two cheap queries
 * per view, which is nothing at this number of trips.
 *
 * The list pages (/ and /trips) stay statically cached — see their `revalidate`.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  if (!TRIP_DETAILS_OPEN) notFound();

  const trip = await getPublishedTrip(params.id);
  // Fail fast: no point building metadata for a trip the page is about to 404
  // on. (This does not by itself fix the status — see the note above.)
  if (!trip) notFound();

  return {
    title: `${trip.name}, ${formatDateRange(trip.startDate, trip.endDate)}`,
    description:
      trip.description ??
      `${trip.name} in ${trip.destination}. ${nightCount(trip.startDate, trip.endDate)} nights, from ${formatPrice(trip.priceFrom)} per person.`,
  };
}

export default async function TripDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Trip pages are not public before launch. A 404 rather than a redirect: the
  // page genuinely does not exist yet, and guessing the URL should reveal
  // nothing about the packages or the pricing.
  if (!TRIP_DETAILS_OPEN) notFound();

  const trip = await getPublishedTrip(params.id);
  if (!trip) notFound();

  const nights = nightCount(trip.startDate, trip.endDate);
  const soldOut = trip.status === "soldOut";

  // Carry the trip through to the booking flow. /bookings/new sits behind auth,
  // so an anonymous visitor gets bounced to /login — without these params they
  // would come back to a generic booking start and have to pick the trip again.
  const bookingHref = `/bookings/new?trip=${trip.id}`;

  const tiers: TierView[] = trip.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: formatPrice(tier.price),
    description: tier.description,
    inclusions: tier.inclusions,
    spotsLeft: tier.spotsLeft,
  }));

  // Only a real gallery is worth a section. Three empty plates under a divider
  // is not a gallery, it is an announcement that there are no photographs.
  const gallery = trip.images;

  return (
    <main className="scheme-light scheme-paint">
      <TripSchema
        siteUrl={getAppUrl()}
        trip={{
          id: trip.id,
          name: trip.name,
          destination: trip.destination,
          description: trip.description,
          startDate: trip.startDate,
          endDate: trip.endDate,
          priceFrom: trip.priceFrom,
          images: trip.images,
          bookable: BOOKINGS_OPEN && !soldOut,
        }}
      />
      {/* ---- masthead ------------------------------------------------------ */}
      <header className="scheme-charcoal scheme-paint relative overflow-hidden">
        {/* Backdrop only when there is an actual photograph. With no image the
            masthead is a plain charcoal ground — laying a scrim over an empty
            placeholder plate just muddies it, and the old version veiled the
            whole frame at 0.5 minimum even when there was nothing to veil. */}
        {trip.images[0] && (
          <>
            <div className="absolute inset-0">
              <Plate
                image={{ src: trip.images[0], alt: `${trip.name}, ${trip.destination}` }}
                fill
                mark={false}
                sizes="100vw"
                priority
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(26_26_26_/_0.92)] via-[rgb(26_26_26_/_0.72)] via-45% to-[rgb(26_26_26_/_0.45)]"
            />
          </>
        )}

        <div className="shell relative pb-16 pt-32 md:pb-20 md:pt-40">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <p className="t-micro text-[--text-secondary]">{trip.destination}</p>
              <StatusBadge status={trip.status} />
            </div>

            <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">{trip.name}</h1>

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[--rule] pt-6 md:grid-cols-4">
              <div>
                <dt className="stamp-type text-[--text-muted]">Dates</dt>
                <dd className="mt-2 font-display text-display-s tracking-title text-[--text]">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </dd>
              </div>
              <div>
                <dt className="stamp-type text-[--text-muted]">Length</dt>
                <dd className="mt-2 font-display text-display-s tracking-title text-[--text]">
                  {nights} {nights === 1 ? "night" : "nights"}
                </dd>
              </div>
              <div>
                <dt className="stamp-type text-[--text-muted]">From</dt>
                <dd className="mt-2 font-display text-display-s tracking-title text-[--text]">
                  {formatPrice(trip.priceFrom)}
                  <span className="t-micro ml-2 text-[--text-secondary]">per person</span>
                </dd>
              </div>
              {!soldOut && (
                <div>
                  <dt className="stamp-type text-[--text-muted]">Availability</dt>
                  <dd className="mt-2 font-display text-display-s tracking-title text-[--text]">
                    {BOOKINGS_OPEN ? availabilityLabel(trip.status) : "Coming soon"}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </header>

      {/* ---- packages ------------------------------------------------------ */}
      <section className="shell py-16 md:py-24">
        <Reveal>
          <div className="flex flex-col gap-5">
            <div>
              <span className="stamp-type text-[--text-muted]">Packages</span>
            </div>
            <h2 className="t-title max-w-[18ch] text-[--text]">
              {tiers.length === 1
                ? "The package"
                : `${tiers.length === 2 ? "Two" : tiers.length === 3 ? "Three" : String(tiers.length)} ways to take the same trip`}
            </h2>
            <p className="t-lede max-w-measure">
              Everyone skis the same days and comes to the same events. What
              changes is where you sleep and how much is handled for you.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <TierTable
            tiers={tiers}
            bookHref={soldOut || !BOOKINGS_OPEN ? null : bookingHref}
            className="mt-12"
          />
        </Reveal>

        <Reveal>
          <p className="t-micro mt-6 text-[--text-muted]">
            {!BOOKINGS_OPEN && `${COMING_SOON_NOTE} `}
            Every package includes on-trip staffing. Flights are booked separately; see Getting there for the airport and transfers.
          </p>
        </Reveal>
      </section>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- the trip ------------------------------------------------------ */}
      {(trip.description || trip.logistics) && (
        <section className="shell py-16 md:py-24">
          <Reveal>
            <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <h2 className="t-heading text-[--text]">The trip</h2>
              <div className="flex flex-col gap-6">
                {trip.description && <p className="t-lede">{trip.description}</p>}
                {trip.logistics && (
                  <div className="border-l-2 border-[--accent] pl-5">
                    <p className="t-micro text-[--text-secondary]">Getting there</p>
                    <p className="mt-3 whitespace-pre-wrap font-body text-body leading-[1.75] text-[--text-secondary]">
                      {trip.logistics}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ---- gallery -------------------------------------------------------- */}
      {gallery.length > 0 && (
        <section className="pb-20 md:pb-28">
          <div className="shell">
            <Reveal>
              <p className="t-micro mb-8 text-[--text-muted]">{trip.destination}</p>
            </Reveal>
          </div>
          {/* Full-bleed on the left so the track runs off the edge of the
              screen, which is what tells you there is more to scroll to. */}
          <div className="pl-[max(1.25rem,calc((100vw-var(--shell))/2+var(--gutter)))] pr-gutter">
            <Reveal>
              <Gallery
                /* Numbered because the photo URLs arrive from the database
                   without any description of what is in them, so the honest
                   alternative to a real caption is at least telling somebody
                   using a screen reader that these are distinct photographs
                   rather than the same one repeated eight times. Proper per
                   image alt text needs a column alongside the URL. */
                images={gallery.map((src, i) => ({
                  src,
                  alt: `${trip.name}, ${trip.destination}. Photo ${i + 1} of ${gallery.length}.`,
                }))}
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- close ---------------------------------------------------------- */}
      <section className="scheme-charcoal scheme-paint">
        <div className="shell flex flex-col items-start gap-7 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <div className="flex flex-col gap-3">
              <h2 className="t-subheading text-[--text]">
                {soldOut ? "This departure is full" : `${trip.name}, ${formatDateRange(trip.startDate, trip.endDate)}`}
              </h2>
              <p className="max-w-measure-tight font-body text-body-s leading-[1.7] text-[--text-secondary]">
                {!BOOKINGS_OPEN
                  ? COMING_SOON_NOTE
                  : soldOut
                    ? "Tell us where you want to go next. The following departure opens to this list first."
                    : "A deposit holds your spot; the balance is split into scheduled installments before departure."}
              </p>
            </div>
          </div>
          {BOOKINGS_OPEN ? (
            <Button href={soldOut ? "/contact" : "/bookings/new"} variant="primary" size="lg">
              {soldOut ? "Get in touch" : "Reserve your spot"}
            </Button>
          ) : (
            <Button href="/contact" variant="primary" size="lg">
              Ask about this trip
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
