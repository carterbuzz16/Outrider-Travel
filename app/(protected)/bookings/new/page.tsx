import Link from "next/link";
import { Alert, Badge, Button, SectionDivider } from "@/components/ui";
import BookingForm from "./BookingForm";
import { computeDepositAmount, DEPOSIT_PERCENTAGE } from "@/lib/deposit";
import {
  formatDateRange,
  formatPrice,
  getPublishedTrip,
  getPublishedTrips,
  nightCount,
  type PublicTier,
  type PublicTrip,
} from "@/lib/trips";

/*
 * Where a reservation actually gets made.
 *
 * The trip pages link here as /bookings/new?trip=<id> so that a visitor who
 * came through login does not have to find their trip again. That parameter is
 * honoured here: with a valid published trip it narrows the page to that one
 * departure, and with anything else it falls back to the full list and says so
 * rather than silently showing everything.
 */
export default async function NewBookingPage(
  props: {
    searchParams: Promise<{ error?: string; trip?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const requestedId = searchParams.trip;
  const requested = requestedId ? await getPublishedTrip(requestedId) : null;
  const trips: PublicTrip[] = requested ? [requested] : await getPublishedTrips();

  // Asked for a specific trip and it is not open: say so, then show the rest.
  const requestMissed = Boolean(requestedId) && requested === null;

  return (
    <main>
      <header className="shell pt-14 md:pt-20">
        <p className="stamp-type text-[--text-muted]">Reserve a spot</p>
        <h1 className="t-title mt-5 max-w-[16ch] text-[--text]">
          {requested ? requested.name : "Pick your departure"}
        </h1>
        <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          Choose a package and pay {Math.round(DEPOSIT_PERCENTAGE * 100)}% now. That deposit holds the room. The balance
          is split into two scheduled payments, taken automatically before you travel.
        </p>

        {requested && (
          <p className="mt-6">
            <Link
              href="/bookings/new"
              className="t-micro text-[--accent] decoration-[--accent] underline-offset-4"
            >
              See every open trip
            </Link>
          </p>
        )}
      </header>

      <div className="shell pb-20 pt-10 md:pb-28">
        {(searchParams.error || requestMissed) && (
          <div className="mb-10 flex flex-col gap-4">
            {searchParams.error && (
              <Alert tone="warning" title="That did not go through">
                {searchParams.error}
              </Alert>
            )}
            {requestMissed && (
              <Alert tone="info" title="That trip is closed">
                The departure you followed is no longer taking bookings. Everything still open is
                below.
              </Alert>
            )}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="flex flex-col items-start gap-6 border border-[--rule] bg-[--surface-raised] px-6 py-14 md:items-center md:px-8 md:py-20 md:text-center">
            <p className="stamp-type text-[--text-muted]">Nothing open</p>
            <h2 className="t-subheading max-w-[22ch] text-[--text]">
              No departures are taking bookings right now
            </h2>
            <p className="max-w-measure-tight font-body text-body leading-[1.7] text-[--text-secondary]">
              Trips go up a few at a time. Tell us where your chapter wants to go and you hear about
              the next one first.
            </p>
            <Button href="/contact" variant="primary" size="md">
              Get in touch
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-16 md:gap-24">
            {trips.map((trip, i) => (
              <section key={trip.id}>
                {i > 0 && <SectionDivider variant="rule" className="mb-12" />}
                <TripBlock trip={trip} single={trips.length === 1} />
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TripBlock({ trip, single }: { trip: PublicTrip; single: boolean }) {
  const nights = nightCount(trip.startDate, trip.endDate);

  return (
    <>
      {/* On a single-trip page the masthead above already carries the name, so
          this drops to the facts rather than repeating the headline. */}
      <div className="flex flex-col gap-4 border-t border-[--rule] pt-7">
        {!single && (
          <>
            <p className="stamp-type text-[--text-muted]">{trip.destination}</p>
            <h2 className="t-heading text-[--text]">{trip.name}</h2>
          </>
        )}
        <dl className="flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <dt className="stamp-type text-[--text-muted]">Dates</dt>
            <dd className="mt-3 font-display text-display-s tracking-title text-[--text]">
              {formatDateRange(trip.startDate, trip.endDate)}
            </dd>
          </div>
          <div>
            <dt className="stamp-type text-[--text-muted]">Length</dt>
            <dd className="mt-3 font-display text-display-s tracking-title text-[--text]">
              {nights} {nights === 1 ? "night" : "nights"}
            </dd>
          </div>
          <div>
            <dt className="stamp-type text-[--text-muted]">Where</dt>
            <dd className="mt-3 font-display text-display-s tracking-title text-[--text]">
              {trip.destination}
            </dd>
          </div>
        </dl>

        {trip.description && (
          <p className="mt-3 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
            {trip.description}
          </p>
        )}
      </div>

      <ul className="mt-10 grid list-none grid-cols-1 gap-6 p-0 lg:grid-cols-2 xl:grid-cols-3">
        {trip.tiers.map((tier) => (
          <li key={tier.id} className="flex">
            <TierCard trip={trip} tier={tier} />
          </li>
        ))}
      </ul>
    </>
  );
}

function TierCard({ trip, tier }: { trip: PublicTrip; tier: PublicTier }) {
  const soldOut = tier.spotsLeft !== null && tier.spotsLeft <= 0;
  const deposit = computeDepositAmount(tier.price);

  return (
    <article className="flex w-full flex-col border border-[--rule] bg-[--surface-raised] p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <h3 className="t-subheading text-[--text]">{tier.name}</h3>
        {soldOut ? (
          <Badge tone="closed">Sold out</Badge>
        ) : tier.spotsLeft !== null && tier.spotsLeft <= 6 ? (
          <Badge tone="urgent">{tier.spotsLeft} left</Badge>
        ) : null}
      </div>

      <p className="mt-4 font-display text-display-m tracking-title text-[--text]">
        {formatPrice(tier.price)}
        <span className="t-micro ml-2 text-[--text-secondary]">per person</span>
      </p>

      {tier.description && (
        <p className="mt-4 font-body text-body-s leading-[1.7] text-[--text-secondary]">
          {tier.description}
        </p>
      )}

      {tier.inclusions.length > 0 && (
        <ul className="mt-5 flex list-none flex-col gap-2.5 p-0">
          {tier.inclusions.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.6rem] h-1 w-1 shrink-0 bg-[--accent]" />
              <span className="font-body text-body-s leading-[1.6] text-[--text-secondary]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-7">
        <BookingForm
          tripId={trip.id}
          tierId={tier.id}
          tierName={tier.name}
          soldOut={soldOut}
          depositLabel={`${formatPrice(deposit)} deposit now`}
        />
      </div>
    </article>
  );
}
