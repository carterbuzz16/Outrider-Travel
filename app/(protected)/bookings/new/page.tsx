import Link from "next/link";
import { Alert, Button, cn } from "@/components/ui";
import CheckoutSteps from "@/components/CheckoutSteps";
import BookingForm, { type CheckoutTier } from "./BookingForm";
import {
  computeDepositAmount,
  computePayInFullAmount,
  DEPOSIT_PERCENTAGE,
  payInFullSaving,
} from "@/lib/deposit";
import { formatAmount } from "@/lib/balance";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { getRoomMedia } from "@/lib/room-media";
import { CONTACT } from "@/lib/site-content";
import {
  availabilityLabel,
  formatDateRange,
  formatPrice,
  getPublishedTrip,
  getPublishedTrips,
  nightCount,
  tierAvailabilityLabel,
  type PublicTrip,
} from "@/lib/trips";

/*
 * Step 1 of checkout: choose the package, choose how to pay.
 *
 * The trip pages link here as /bookings/new?trip=<id>, and a package's Reserve
 * button adds &package=<tier name> so it arrives already selected. Both survive
 * the trip through /login (middleware keeps the query string on `next`).
 *
 * With one trip (asked for, or the only one open) the page is the package
 * form. With several and none asked for, it first asks which dates, as a short
 * list of links, since the packages belong to a departure. A trip that was
 * asked for and is not open says so, then offers the rest.
 */
export default async function NewBookingPage(props: {
  searchParams: Promise<{ error?: string; trip?: string; package?: string }>;
}) {
  const searchParams = await props.searchParams;
  const requestedId = searchParams.trip;
  const requested = requestedId ? await getPublishedTrip(requestedId) : null;
  const trips: PublicTrip[] = requested ? [requested] : await getPublishedTrips();
  const requestMissed = Boolean(requestedId) && requested === null;
  const trip = trips.length === 1 ? trips[0] : null;

  const alerts = (searchParams.error || requestMissed) && (
    <div className="mt-8 flex flex-col gap-4">
      {searchParams.error && (
        <Alert tone="warning" title="That did not go through">
          {searchParams.error}
        </Alert>
      )}
      {requestMissed && (
        <Alert tone="info" title="That trip is closed">
          The departure you followed is no longer taking bookings. Everything still open is below.
        </Alert>
      )}
    </div>
  );

  return (
    <main>
      <div className="shell max-w-[76rem] pb-20 pt-8 md:pb-28 md:pt-12">
        <CheckoutSteps current={1} />

        {trips.length === 0 ? (
          <>
            {alerts}
            <NothingOpen />
          </>
        ) : trip ? (
          <>
            <TripHeader trip={trip} showAll={Boolean(requested) || trips.length > 1} />
            {alerts}
            <div className="mt-10 md:mt-12">
              <Packages trip={trip} requestedPackage={searchParams.package} />
            </div>
          </>
        ) : (
          <>
            <header className="mt-8 border-b border-[--rule] pb-6 md:mt-10">
              <h1 className="t-heading text-[--text]">Choose your dates</h1>
              <p className="mt-2 font-body text-body text-[--text-secondary]">
                Every departure is the same trip. Pick the week, then the package.
              </p>
            </header>
            {alerts}
            <Departures trips={trips} requestedPackage={searchParams.package} />
          </>
        )}
      </div>
    </main>
  );
}

/* -- the trip, compactly ---------------------------------------------------- */

function TripHeader({ trip, showAll }: { trip: PublicTrip; showAll: boolean }) {
  const nights = nightCount(trip.startDate, trip.endDate);
  return (
    <header className="mt-8 flex flex-col gap-3 border-b border-[--rule] pb-6 sm:flex-row sm:items-end sm:justify-between md:mt-10">
      <div className="min-w-0">
        <h1 className="t-heading text-[--text]">{trip.name}</h1>
        <p className="mt-2 font-body text-body text-[--text-secondary]">
          <span className="text-[--text]">{formatDateRange(trip.startDate, trip.endDate)}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {nights} {nights === 1 ? "night" : "nights"}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {trip.destination}
        </p>
      </div>
      {showAll && (
        <Link
          href="/bookings/new"
          className="inline-flex min-h-11 shrink-0 items-center font-body text-body-s text-[--accent] underline underline-offset-4"
        >
          Change dates
        </Link>
      )}
    </header>
  );
}

/* -- the packages ------------------------------------------------------------ */

function Packages({ trip, requestedPackage }: { trip: PublicTrip; requestedPackage?: string }) {
  const tiers: CheckoutTier[] = trip.tiers.map((tier) => {
    const soldOut = tier.spotsLeft !== null && tier.spotsLeft <= 0;
    const room = getRoomMedia(tier.name);
    const full = computePayInFullAmount(tier.price);
    const deposit = computeDepositAmount(tier.price);
    const saving = payInFullSaving(tier.price);
    return {
      id: tier.id,
      name: tier.name,
      soldOut,
      availability: soldOut ? null : tierAvailabilityLabel(tier.spotsLeft),
      summary: room?.summary ?? tier.description,
      inclusions: tier.inclusions,
      room,
      // Exact to the cent: formatPrice rounds to the dollar, and these are
      // the figures that come off the card.
      priceLabel: formatAmount(tier.price),
      depositLabel: formatAmount(deposit),
      fullLabel: formatAmount(full),
      balanceLabel: formatAmount(Math.round((tier.price - deposit) * 100) / 100),
      savingLabel: saving > 0 ? formatAmount(saving) : null,
    };
  });

  const open = tiers.filter((t) => !t.soldOut);
  if (open.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border border-[--rule] bg-[--surface-raised] p-6 md:p-10">
        <h2 className="t-subheading text-[--text]">Every package on these dates is taken</h2>
        <p className="max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          Another departure may still have room.
        </p>
        <Button href="/bookings/new" variant="secondary" size="md">
          See every open trip
        </Button>
      </div>
    );
  }

  // The package named in the link, if it is open; otherwise the first open one.
  const wanted = requestedPackage?.trim().toLowerCase();
  const initial = open.find((t) => wanted && t.name.trim().toLowerCase() === wanted) ?? open[0];

  return (
    <BookingForm
      tripId={trip.id}
      tiers={tiers}
      initialTierId={initial.id}
      depositPercent={Math.round(DEPOSIT_PERCENTAGE * 100)}
      installmentCount={INSTALLMENT_OFFSETS_DAYS.length}
      contactEmail={CONTACT.email}
    />
  );
}

/* -- several departures ------------------------------------------------------- */

function Departures({ trips, requestedPackage }: { trips: PublicTrip[]; requestedPackage?: string }) {
  const packageParam = requestedPackage ? `&package=${encodeURIComponent(requestedPackage)}` : "";
  return (
    <ul className="m-0 mt-8 flex list-none flex-col gap-3 p-0">
      {trips.map((trip) => {
        const soldOut = trip.status === "soldOut";
        const nights = nightCount(trip.startDate, trip.endDate);
        const body = (
          <>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-display text-display-s font-medium tracking-title text-[--text]">
                {formatDateRange(trip.startDate, trip.endDate)}
              </span>
              <span className="font-body text-body-s text-[--text-secondary]">
                {trip.name} · {nights} {nights === 1 ? "night" : "nights"} · {trip.destination}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <span className="font-body text-body tabular-nums text-[--text]">
                From {formatPrice(trip.priceFrom)}
              </span>
              <span className={cn("t-micro", trip.status === "few" ? "text-[--flag-ink]" : "text-[--text-secondary]")}>
                {availabilityLabel(trip.status)}
              </span>
            </span>
          </>
        );
        const box =
          "flex flex-col gap-4 border border-[--rule] bg-[--surface-raised] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6";
        return (
          <li key={trip.id}>
            {soldOut ? (
              <div className={cn(box, "opacity-60")} aria-disabled="true">
                {body}
              </div>
            ) : (
              <Link
                href={`/bookings/new?trip=${trip.id}${packageParam}`}
                className={cn(
                  box,
                  "no-underline transition-colors duration-fast hover:border-[--accent-solid]",
                )}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function NothingOpen() {
  return (
    <div className="mt-10 flex flex-col items-start gap-6 border border-[--rule] bg-[--surface-raised] px-6 py-14 md:px-10 md:py-16">
      <h1 className="t-heading max-w-[22ch] text-[--text]">No departures are taking bookings right now</h1>
      <p className="max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
        Trips go up a few at a time. Tell us where your chapter wants to go and you hear about the
        next one first.
      </p>
      <Button href="/contact" variant="primary" size="md">
        Get in touch
      </Button>
    </div>
  );
}
