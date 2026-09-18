import Link from "next/link";
import { Alert, Button, cn } from "@/components/ui";
import CheckoutSteps from "@/components/CheckoutSteps";
import BookingForm, { type CheckoutTier } from "./BookingForm";
import JoinGroup, { type JoinGroupResult } from "./JoinGroup";
import PenthouseProgress from "@/components/PenthouseProgress";
import { PENTHOUSE_DISCLAIMER } from "@/lib/penthouse";
import {
  computeDepositAmount,
  computePayInFullAmount,
  DEPOSIT_PERCENTAGE,
  payInFullSaving,
} from "@/lib/deposit";
import { formatAmount } from "@/lib/balance";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { countPenthouses, getRoomMedia, tierGrouping } from "@/lib/room-media";
import { CONTACT } from "@/lib/site-content";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import {
  availabilityLabel,
  checkGroupCode,
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
  searchParams: Promise<{ error?: string; trip?: string; package?: string; group?: string }>;
}) {
  const searchParams = await props.searchParams;
  const requestedId = searchParams.trip;
  const requested = requestedId ? await getPublishedTrip(requestedId) : null;
  const trips: PublicTrip[] = requested ? [requested] : await getPublishedTrips();
  const requestMissed = Boolean(requestedId) && requested === null;
  const trip = trips.length === 1 ? trips[0] : null;

  // ?group=CODE, from a friend's invite link or the JoinGroup form. Checked on
  // the server against the penthouse claims; the page only ever learns which
  // tiers this code opens, never whose code holds the others.
  const hasPenthouse = trip?.tiers.some((t) => t.groupExclusive) ?? false;
  //
  // Each check answers "is this a real code on these dates", so it is capped
  // per IP like /api/penthouse-progress: plenty for a group typing a code
  // wrong a few times, useless for walking the code space. Over the cap the
  // code is simply not checked.
  const groupAllowed =
    Boolean(trip && searchParams.group) && (await checkRateLimit(`group-check:${await clientIp()}`, 60, 60 * 60));
  const group = trip && searchParams.group && groupAllowed ? await checkGroupCode(trip, searchParams.group) : null;
  const joinResult: JoinGroupResult = !group?.code
    ? { state: "none" }
    : group.unlocks.length > 0
      ? { state: "unlocked", tierNames: trip!.tiers.filter((t) => group.unlocks.includes(t.id)).map((t) => t.name) }
      : group.knownOnTrip
        ? { state: "not-penthouse" }
        : { state: "unknown" };

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
            {/* Joining friends with their code: their penthouse's progress, shown
                only because the code matched (checkGroupCode, server-side). */}
            {group?.code &&
              trip.tiers
                .filter((t) => group.progress[t.id])
                .map((t) => (
                  <PenthouseProgress
                    key={t.id}
                    className="mt-8"
                    initial={group.progress[t.id]}
                    renderedAt={new Date().toISOString()}
                    tierId={t.id}
                    groupCode={group.code!}
                    joining={titleCase(t.name)}
                  />
                ))}
            <div className="mt-10 md:mt-12">
              <Packages
                trip={trip}
                requestedPackage={searchParams.package}
                unlocked={group?.unlocks ?? []}
                groupCode={group?.knownOnTrip ? (group.code ?? undefined) : undefined}
              />
            </div>
            {hasPenthouse && (
              <JoinGroup
                tripId={trip.id}
                requestedPackage={searchParams.package}
                code={group?.code ?? undefined}
                result={joinResult}
              />
            )}
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
            <Departures trips={trips} requestedPackage={searchParams.package} group={searchParams.group} />
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

function Packages({
  trip,
  requestedPackage,
  unlocked,
  groupCode,
}: {
  trip: PublicTrip;
  requestedPackage?: string;
  /** Claimed penthouses the ?group= code opens (checked server-side). */
  unlocked: string[];
  /** A code known on this trip, to prefill the order's group code field. */
  groupCode?: string;
}) {
  const tiers: CheckoutTier[] = trip.tiers.map((tier) => {
    // A penthouse another group holds is taken, unless the code in the link is
    // that group's. Then it is theirs to join, capacity permitting.
    const taken = tier.claimed && !unlocked.includes(tier.id);
    const soldOut = taken || (tier.spotsLeft !== null && tier.spotsLeft <= 0);
    const room = getRoomMedia(tier.name);
    const full = computePayInFullAmount(tier.price);
    const deposit = computeDepositAmount(tier.price);
    const saving = payInFullSaving(tier.price);
    return {
      id: tier.id,
      name: tier.name,
      soldOut,
      taken,
      terms: tier.groupExclusive ? PENTHOUSE_DISCLAIMER : null,
      availability: soldOut ? null : tierAvailabilityLabel(tier.spotsLeft),
      summary: room?.summary ?? tier.description,
      inclusions: tier.inclusions,
      room,
      ...tierGrouping(tier.name, countPenthouses(trip.tiers)),
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

  // The package named in the link (by name from the trip pages, by id from a
  // penthouse invite), if it is open; then a penthouse the group code opened;
  // otherwise the first open one.
  const wanted = requestedPackage?.trim().toLowerCase();
  const initial =
    open.find((t) => wanted && (t.name.trim().toLowerCase() === wanted || t.id === wanted)) ??
    open.find((t) => unlocked.includes(t.id)) ??
    open[0];

  return (
    <BookingForm
      tripId={trip.id}
      tiers={tiers}
      initialTierId={initial.id}
      depositPercent={Math.round(DEPOSIT_PERCENTAGE * 100)}
      installmentCount={INSTALLMENT_OFFSETS_DAYS.length}
      contactEmail={CONTACT.email}
      initialGroupCode={groupCode}
    />
  );
}

/* -- several departures ------------------------------------------------------- */

function Departures({
  trips,
  requestedPackage,
  group,
}: {
  trips: PublicTrip[];
  requestedPackage?: string;
  group?: string;
}) {
  const packageParam =
    (requestedPackage ? `&package=${encodeURIComponent(requestedPackage)}` : "") +
    (group ? `&group=${encodeURIComponent(group)}` : "");
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

/** "PENTHOUSE 702" reads as "Penthouse 702" in a sentence. */
function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
