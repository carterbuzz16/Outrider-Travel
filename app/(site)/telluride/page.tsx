import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Plate, Reveal, SectionDivider, StatusBadge, WaitlistCTA } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import {
  BOOKINGS_OPEN,
  COMING_SOON_LABEL,
  TRIP_DETAILS_OPEN,
} from "@/lib/booking-window";
import { NOT_INCLUDED_NOTE, SHARED_INCLUSIONS } from "@/lib/site-content";
import {
  availabilityLabel,
  formatDateRange,
  formatPrice,
  getPublishedTrips,
  nightCount,
  type PublicTrip,
} from "@/lib/trips";

/*
 * /telluride: both Telluride departures on one page.
 *
 * This is the landing page the booking emails link to, as
 * https://outrider.travel/telluride and https://outrider.travel/telluride#included.
 * Both URLs are in mail that has already been sent, so the route and the
 * `included` anchor must not be renamed or removed. The anchor renders before
 * launch as well, with whatever inclusion detail is public at that point.
 *
 * Launch gating follows app/(site)/trips/[id]/page.tsx exactly: before
 * TRIP_DETAILS_OPEN the departures are teased as dates and length only, with no
 * price, no packages and no link to a trip page (those 404 until launch).
 * Nothing here is hard-coded: dates, prices and package inclusions all come from
 * the published trips.
 */

export const metadata: Metadata = pageMetadata({
  title: "Telluride ski weeks",
  path: "/telluride",
  description:
    "Outrider's Telluride departures for college students this winter: the dates, what every package includes, and how to get there.",
});

// Same cadence as /trips, so publishing or editing a departure shows up here
// without a redeploy.
export const revalidate = 300;

/** Case-insensitive, so "Telluride, Colorado" and "telluride" both count. */
function isTelluride(trip: PublicTrip): boolean {
  return trip.destination.toLowerCase().includes("telluride");
}

type PackageView = {
  key: string;
  name: string;
  description: string | null;
  inclusions: string[];
  /** Departures this package is offered on, when it is not offered on all. */
  onlyOn: string[] | null;
};

/**
 * One entry per distinct package across the departures.
 *
 * The two Telluride departures are expected to carry the same packages, and
 * listing the same three columns twice would read as six choices. So packages
 * are merged by name, description and inclusions, and a package that only
 * exists on some departures says which. Prices are left to the departure
 * blocks and the trip pages, because they can differ between dates.
 */
function mergePackages(trips: PublicTrip[]): PackageView[] {
  const byKey = new Map<string, PackageView & { trips: string[] }>();
  for (const trip of trips) {
    const dates = formatDateRange(trip.startDate, trip.endDate);
    for (const tier of trip.tiers) {
      const key = JSON.stringify([tier.name, tier.description, tier.inclusions]);
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.trips.includes(dates)) existing.trips.push(dates);
      } else {
        byKey.set(key, {
          key,
          name: tier.name,
          description: tier.description,
          inclusions: tier.inclusions,
          onlyOn: null,
          trips: [dates],
        });
      }
    }
  }
  return [...byKey.values()].map(({ trips: on, ...pkg }) => ({
    ...pkg,
    onlyOn: on.length < trips.length ? on : null,
  }));
}

export default async function TelluridePage() {
  const trips = (await getPublishedTrips()).filter(isTelluride);
  const packages = TRIP_DETAILS_OPEN ? mergePackages(trips) : [];

  return (
    <main className="scheme-light scheme-paint">
      {/* ---- masthead ------------------------------------------------------ */}
      <header className="scheme-espresso scheme-paint relative overflow-hidden">
        <div className="absolute inset-0">
          <Plate
            image={{ src: "/images/telluride/alpenglow.jpg", alt: "Alpenglow on the peaks above Telluride." }}
            fill
            mark={false}
            sizes="100vw"
            priority
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(42_35_32_/_0.92)] via-[rgb(42_35_32_/_0.72)] via-45% to-[rgb(42_35_32_/_0.45)]"
        />

        <div className="shell relative pb-16 pt-32 md:pb-20 md:pt-40">
          <p className="t-micro text-[--text-secondary]">Telluride, Colorado</p>
          <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Telluride</h1>
          <p className="t-lede mt-8 max-w-measure text-[--text]">
            {trips.length === 1
              ? "One departure this winter."
              : trips.length > 1
                ? `${trips.length === 2 ? "Two" : String(trips.length)} departures this winter.`
                : "Departures for this winter are not on the site yet."}{" "}
            One property, lift tickets and transfers arranged before you land,
            and Outrider staff there for the whole trip.
          </p>
        </div>
      </header>

      {/* ---- departures ---------------------------------------------------- */}
      <section className="shell py-16 md:py-24" aria-labelledby="departures">
        <Reveal>
          <div className="flex flex-col gap-5">
            <p className="t-rule-label text-[--text]">Departures</p>
            <h2 id="departures" className="t-title max-w-[18ch] text-[--text]">
              The dates
            </h2>
            <p className="t-lede max-w-measure">
              Every departure is the same trip: the same property, the same
              days on the mountain and the same events. Pick the dates that
              work.
            </p>
          </div>
        </Reveal>

        {trips.length > 0 ? (
          <div
            className={`mt-12 grid gap-px border border-[--rule] bg-[--rule] ${
              trips.length > 1 ? "md:grid-cols-2" : ""
            }`}
          >
            {trips.map((trip) => (
              <Departure key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-12 border border-[--rule] bg-[--surface-raised] p-8 md:p-12">
              <p className="t-micro text-[--text-muted]">Nothing open right now</p>
              <p className="mt-4 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
                The Telluride dates are not on the site at the moment. Write to{" "}
                <Link href="/contact" className="text-[--accent] underline underline-offset-4">
                  us
                </Link>{" "}
                with any questions in the meantime.
              </p>
            </div>
          </Reveal>
        )}

        {!BOOKINGS_OPEN && trips.length > 0 && (
          // Not COMING_SOON_NOTE: that promises packages and pricing "below",
          // and before launch this page does not show them.
          <p className="t-micro mt-6 text-[--text-muted]">
            Booking opens shortly. These dates are final.
          </p>
        )}
      </section>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- what's included ------------------------------------------------
          id="included" is linked from the booking emails. Do not rename it,
          and keep it rendering in every launch state. scroll-mt clears the
          fixed nav when the page opens on the anchor. */}
      <section id="included" className="shell scroll-mt-28 py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <div className="flex flex-col gap-5 md:sticky md:top-32">
              <p className="t-rule-label text-[--text]">Included</p>
              <h2 className="t-title max-w-[14ch] text-[--text]">What the price covers</h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col gap-10">
              <div>
                <h3 className="t-subheading text-[--text]">In every package</h3>
                <ul className="m-0 mt-5 flex list-none flex-col p-0">
                  {SHARED_INCLUSIONS.map((item) => (
                    <li
                      key={item}
                      className="border-b border-[--rule] py-3 font-body text-body leading-[1.7] text-[--text] last:border-0"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  {NOT_INCLUDED_NOTE}{" "}
                  <Link href="/flights" className="text-[--accent] underline underline-offset-4">
                    Read the flight guide
                  </Link>
                  .
                </p>
              </div>

              {packages.length > 0 ? (
                <div>
                  <h3 className="t-subheading text-[--text]">By package</h3>
                  <p className="mt-3 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                    Everyone skis the same days and comes to the same events.
                    What changes is where you sleep and how much is handled for
                    you.
                  </p>
                  <div className="mt-6 grid gap-px border border-[--rule] bg-[--rule]">
                    {packages.map((pkg) => (
                      <div key={pkg.key} className="flex flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <h4 className="t-subheading text-[--text]">{pkg.name}</h4>
                          {pkg.onlyOn && (
                            <span className="t-micro text-[--text-muted]">
                              {pkg.onlyOn.join(" and ")} only
                            </span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                            {pkg.description}
                          </p>
                        )}
                        {pkg.inclusions.length > 0 && (
                          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 font-body text-body-s leading-[1.7] text-[--text]">
                            {pkg.inclusions.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !TRIP_DETAILS_OPEN && (
                  // Pre-launch the packages stay back, as they do on the trip
                  // page. Say so rather than leave the section looking short.
                  <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                    The packages, and what each one adds, go up with the
                    pricing when booking opens.
                  </p>
                )
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- getting there -------------------------------------------------- */}
      <section className="shell py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <h2 className="t-heading text-[--accent] md:sticky md:top-32">Getting there</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-6">
              <p className="font-body text-body leading-[1.85] text-[--text]">
                Fly into Montrose (MTJ), about 65 miles from Telluride and
                roughly an hour and a half by road. Ground transport from
                Montrose and back is arranged and included.
              </p>
              <p className="font-body text-body leading-[1.85] text-[--text-secondary]">
                The flight guide covers which airport to pick, the arrival and
                departure windows for each set of dates, and what to do if the
                only routing you can find is a poor one.
              </p>
              <div>
                <Button href="/flights" variant="secondary">
                  Flight guide
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {BOOKINGS_OPEN ? (
        <section className="scheme-espresso scheme-paint">
          <div className="shell flex flex-col items-start gap-7 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div className="flex flex-col gap-3">
              <h2 className="t-subheading text-[--text]">Questions before you book</h2>
              <p className="max-w-measure-tight font-body text-body-s leading-[1.7] text-[--text-secondary]">
                Paying, cancelling, rooming with friends and the rest are
                answered in the FAQ.
              </p>
            </div>
            <Button href="/faq" variant="primary" size="lg">
              Read the FAQ
            </Button>
          </div>
        </section>
      ) : (
        <WaitlistCTA
          id="waitlist"
          placement="telluride"
          heading="Know when Telluride opens"
          body="Departures open to this list first. One email when booking opens, and nothing in between."
        />
      )}
    </main>
  );
}

/** One departure: dates, length, and the controls the trip page would show. */
function Departure({ trip }: { trip: PublicTrip }) {
  const nights = nightCount(trip.startDate, trip.endDate);
  const soldOut = trip.status === "soldOut";
  const dates = formatDateRange(trip.startDate, trip.endDate);
  // Same deep link the trip page builds, so a signed-out visitor comes back
  // from /login to this departure rather than to a generic booking start.
  const bookingHref = `/bookings/new?trip=${trip.id}`;

  return (
    <div className="flex h-full flex-col gap-6 bg-[--surface-raised] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="t-micro text-[--text-secondary]">{trip.name}</p>
        {/* Same rule as TripCard: before launch the badge says so, once. */}
        {BOOKINGS_OPEN ? (
          <StatusBadge status={trip.status} />
        ) : (
          <Badge tone="neutral">{COMING_SOON_LABEL}</Badge>
        )}
      </div>

      <h3 className="font-display font-medium text-display-s tracking-title text-[--text]">{dates}</h3>

      <dl className="grid grid-cols-2 gap-6 border-t border-[--rule] pt-5">
        <div>
          <dt className="stamp-type text-[--text-muted]">Length</dt>
          <dd className="mt-2 font-body text-body text-[--text]">
            {nights} {nights === 1 ? "night" : "nights"}
          </dd>
        </div>
        <div>
          <dt className="stamp-type text-[--text-muted]">Fly into</dt>
          <dd className="mt-2 font-body text-body text-[--text]">Montrose (MTJ)</dd>
        </div>
        {/* No price while nothing can be bought, matching /trips. */}
        {BOOKINGS_OPEN && (
          <div>
            <dt className="stamp-type text-[--text-muted]">From</dt>
            <dd className="mt-2 font-body text-body text-[--text]">
              {formatPrice(trip.priceFrom)} per person
            </dd>
          </div>
        )}
        {BOOKINGS_OPEN && !soldOut && (
          <div>
            <dt className="stamp-type text-[--text-muted]">Availability</dt>
            <dd className="mt-2 font-body text-body text-[--text]">{availabilityLabel(trip.status)}</dd>
          </div>
        )}
      </dl>

      {/* The trip page 404s before launch, so it is only linked once it exists. */}
      {TRIP_DETAILS_OPEN && (
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
          {BOOKINGS_OPEN && !soldOut && (
            <Button href={bookingHref} variant="primary">
              Reserve your spot
            </Button>
          )}
          <Button href={`/trips/${trip.id}`} variant="secondary">
            Trip details
          </Button>
        </div>
      )}
    </div>
  );
}
