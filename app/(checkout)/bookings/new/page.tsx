import Link from "next/link";
import { Alert, Button, cn } from "@/components/ui";
import CheckoutSteps from "@/components/CheckoutSteps";
import BookingForm, { type CheckoutTier } from "./BookingForm";
import JoinGroup, { type JoinGroupResult } from "./JoinGroup";
import PenthouseProgress from "@/components/PenthouseProgress";
import { PENTHOUSE_DISCLAIMER } from "@/lib/penthouse";
import {
  applyDiscount,
  computeDepositAmount,
  computePayInFullAmount,
  DEPOSIT_PERCENTAGE,
  payInFullSaving,
} from "@/lib/deposit";
import { discountCodeAmount, normalizeDiscountCode } from "@/lib/discount-codes";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAmount } from "@/lib/balance";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { countPenthouses, getRoomMedia, tierDisplayName, tierGrouping } from "@/lib/room-media";
import { CONTACT } from "@/lib/site-content";
import { checkRateLimit } from "@/lib/rate-limit";
import { bookingsOpenForViewer } from "@/lib/early-access";
import { hasDeparted } from "@/lib/mountain-time";
import { checkoutErrorText } from "@/lib/flash";
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
 * Open to everyone, signed in or not (app/(checkout)/layout.tsx): the account
 * is made at the form's Continue button with an emailed code.
 *
 * With one trip (asked for, or the only one open) the page is the package
 * form. With several and none asked for, it first asks which dates, as a short
 * list of links, since the packages belong to a departure. A trip that was
 * asked for and is not open says so, then offers the rest.
 */
export default async function NewBookingPage(props: {
  searchParams: Promise<{ error?: string; trip?: string; package?: string; group?: string; code?: string }>;
}) {
  const searchParams = await props.searchParams;

  // Who is looking, if anyone. Signed in with a confirmed email means the
  // form's Continue goes straight to createBooking; otherwise it asks for an
  // email and a code first. An unconfirmed session (none should exist while
  // Supabase's "Confirm email" is on) is treated as signed out, since the
  // code confirms the address and createBooking would refuse it anyway.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const signedIn = Boolean(user?.email_confirmed_at) && !user?.is_anonymous;

  // ?code=, a giveaway discount code (lib/discount-codes.ts), from the link we
  // text a winner or from the Apply button beside the code box. Checked once,
  // here: a live code opens booking during the head start (a winner is as good
  // as invited, lib/early-access.ts) and the prices below already have it off.
  // createBooking checks again and claims it. Capped per IP like the group
  // check, so the page cannot be used to guess codes; over the cap, or unknown,
  // it simply shows as not working.
  const discountCode = normalizeDiscountCode(searchParams.code);
  let discount: Discount | null = null;
  if (discountCode && (await checkRateLimit(`discount-check:${await clientIp()}`, 30, 60 * 60))) {
    // Checked for signed-out visitors too, now that they can see prices here.
    // The user id only matters for someone with an abandoned checkout of
    // their own (see discount_code_uses).
    const amount = await discountCodeAmount(createAdminClient(), discountCode, user?.id);
    if (amount !== null) discount = { code: discountCode, amount };
  }
  const discountRejected = Boolean(discountCode) && discount === null;

  // Not on sale yet: nothing to choose, so no packages and no trip lookups.
  // createBooking refuses too, and sends anyone who posts anyway back here.
  // The list is the exception during its head start, and so is anyone holding
  // a live discount code (lib/early-access.ts). The code was checked above, so
  // it is not looked up a second time here.
  if (!discount && !(await bookingsOpenForViewer())) {
    return (
      <main>
        <div className="shell max-w-[76rem] pb-20 pt-8 md:pb-28 md:pt-12">
          <OpensSoon badLink={searchParams.error === "early_access"} />
        </div>
      </main>
    );
  }

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
      ? { state: "unlocked", tierNames: trip!.tiers.filter((t) => group.unlocks.includes(t.id)).map((t) => tierDisplayName(t.name)) }
      : group.knownOnTrip
        ? { state: "not-penthouse" }
        : { state: "unknown" };

  // ?error= is a code (lib/flash.ts), never text to show as it stands. A
  // penthouse held by another group is named from the package in the link,
  // looked up on the trip, not taken from the query string.
  const wantedPackage = searchParams.package?.trim().toLowerCase();
  const namedTier = trip?.tiers.find((t) => t.id === wantedPackage || t.name.trim().toLowerCase() === wantedPackage);
  const errorText = checkoutErrorText(searchParams.error, namedTier?.name);

  const alerts = (errorText || requestMissed) && (
    <div className="mt-8 flex flex-col gap-4">
      {errorText && (
        <Alert tone="warning" title="That did not go through">
          {errorText}
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
                    joining={tierDisplayName(t.name)}
                  />
                ))}
            <div className="mt-10 md:mt-12">
              <Packages
                trip={trip}
                requestedPackage={searchParams.package}
                unlocked={group?.unlocks ?? []}
                groupCode={group?.knownOnTrip ? (group.code ?? undefined) : undefined}
                discount={discount}
                rejectedCode={discountRejected ? discountCode : null}
                signedIn={signedIn}
              />
            </div>
            {hasPenthouse && (
              <JoinGroup
                tripId={trip.id}
                requestedPackage={searchParams.package}
                discountCode={discount?.code}
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
            <Departures
              trips={trips}
              requestedPackage={searchParams.package}
              group={searchParams.group}
              code={normalizeDiscountCode(searchParams.code) ?? undefined}
            />
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
          {", "}
          {nights} {nights === 1 ? "night" : "nights"}
          {", "}
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

/** A discount code that checked out, and what it takes off. */
type Discount = { code: string; amount: number };

function Packages({
  trip,
  requestedPackage,
  unlocked,
  groupCode,
  discount,
  rejectedCode,
  signedIn,
}: {
  trip: PublicTrip;
  requestedPackage?: string;
  /** Claimed penthouses the ?group= code opens (checked server-side). */
  unlocked: string[];
  /** A code known on this trip, to prefill the order's group code field. */
  groupCode?: string;
  /** A ?code= that checked out: every figure below has it off. */
  discount: Discount | null;
  /** A ?code= that did not, to show in the box with a line saying so. */
  rejectedCode: string | null;
  signedIn: boolean;
}) {
  const off = discount?.amount ?? 0;
  const tiers: CheckoutTier[] = trip.tiers.map((tier) => {
    // A penthouse another group holds is taken, unless the code in the link is
    // that group's. Then it is theirs to join, capacity permitting.
    const taken = tier.claimed && !unlocked.includes(tier.id);
    const soldOut = taken || (tier.spotsLeft !== null && tier.spotsLeft <= 0);
    const room = getRoomMedia(tier.name);
    // The code comes off after the pay-in-full saving, as in createBooking, so
    // these are exactly the figures the card will be charged.
    const price = applyDiscount(tier.price, off);
    const full = applyDiscount(computePayInFullAmount(tier.price), off);
    const deposit = computeDepositAmount(price);
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
      balanceLabel: formatAmount(Math.round((price - deposit) * 100) / 100),
      savingLabel: saving > 0 ? formatAmount(saving) : null,
    };
  });

  // A departure that is closed as a whole (it leaves today or has left, or
  // every place is gone) offers nothing, whatever a single tier's count says.
  // createBooking refuses a departed trip as well.
  const departed = hasDeparted(trip.startDate);
  const open = departed || trip.status === "soldOut" ? [] : tiers.filter((t) => !t.soldOut);
  if (open.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border border-[--rule] bg-[--surface-raised] p-6 md:p-10">
        <h2 className="t-subheading text-[--text]">
          {departed ? "These dates are no longer taking bookings" : "Every package on these dates is taken"}
        </h2>
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
      installmentOffsets={INSTALLMENT_OFFSETS_DAYS}
      contactEmail={CONTACT.email}
      initialGroupCode={groupCode}
      discount={discount ? { code: discount.code, label: formatAmount(discount.amount) } : null}
      rejectedCode={rejectedCode}
      signedIn={signedIn}
    />
  );
}

/* -- several departures ------------------------------------------------------- */

function Departures({
  trips,
  requestedPackage,
  group,
  code,
}: {
  trips: PublicTrip[];
  requestedPackage?: string;
  group?: string;
  /** A ?code= from a winner's link, carried on so choosing the dates keeps it. */
  code?: string;
}) {
  const packageParam =
    (requestedPackage ? `&package=${encodeURIComponent(requestedPackage)}` : "") +
    (group ? `&group=${encodeURIComponent(group)}` : "") +
    (code ? `&code=${encodeURIComponent(code)}` : "");
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
                {trip.name}, {nights} {nights === 1 ? "night" : "nights"}, {trip.destination}
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

/** Before bookings open: where to look meanwhile, instead of packages nobody can buy. */
/**
 * Before launch. `badLink` is an early-access link that did not check out
 * (mistyped, or its owner unsubscribed), said plainly so nobody thinks the
 * site is broken.
 */
function OpensSoon({ badLink = false }: { badLink?: boolean }) {
  return (
    <div className="mt-10 flex flex-col items-start gap-6 border border-[--rule] bg-[--surface-raised] px-6 py-14 md:px-10 md:py-16">
      {badLink && (
        <p className="max-w-measure font-body text-body leading-[1.7] text-[--text]">
          That early-access link didn&rsquo;t open booking. Use the button in your
          email, or write to bookings@outrider.travel and we&rsquo;ll send it again.
        </p>
      )}
      <h1 className="t-heading max-w-[22ch] text-[--text]">Booking opens soon</h1>
      <p className="max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
        The dates, the packages and the pricing are final, and we&rsquo;ll be taking spots shortly. Join the
        list to hear the moment it opens.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button href="/telluride" variant="primary" size="md">
          See the trip
        </Button>
        <Button href="/waitlist" variant="secondary" size="md">
          Join the list
        </Button>
      </div>
    </div>
  );
}
