import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Button, Facts, ScheduleTable, Stamp } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { syncPaymentFromStripe } from "@/lib/stripe-sync";
import { formatDay } from "@/app/(protected)/dates";
import { formatAmount, toCents } from "@/lib/balance";
import { formatDateRange } from "@/lib/trips";
import { createPortalUrl } from "@/lib/portal-token";
import { confirmationNumber } from "@/lib/confirmation-number";
import { tierDisplayName } from "@/lib/tier-display";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPenthouseProgress } from "@/lib/tier-claims";
import { penthouseInvitePath, toSnapshot } from "@/lib/penthouse";
import PenthouseProgress from "@/components/PenthouseProgress";

export default async function ConfirmationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view own bookings") scopes this to the signed-in user.
  const loadBooking = () =>
    supabase
      .from("bookings")
      .select(
        "id, trip_id, tier_id, status, total_amount, deposit_amount, group_code, trips(name, destination, start_date, end_date), tiers(name), payments(id, status, amount, scheduled_date, stripe_payment_intent_id)"
      )
      .eq("id", params.id)
      .single();

  let { data: booking } = await loadBooking();

  if (!booking) {
    notFound();
  }

  // A cancelled booking first, before anything else is worked out: its
  // payment can still read as succeeded at Stripe (a card form paid as the
  // booking was cancelled, or a late checkout refunded by lib/payments.ts),
  // and nothing on this page may then say the place is held. Stripe is not
  // asked either; there is nothing left to settle here.
  if (booking.status === "cancelled") {
    return <CancelledBooking booking={booking} />;
  }

  /*
   * The deposit is the payment with no scheduled_date: installments are always
   * written with one (lib/installments.ts) and the deposit never is (see
   * bookings/actions.ts). The previous version took payments[0], which is
   * whatever order PostgREST returned — once installments existed on the
   * booking that could be an installment row with a null payment intent, and
   * the page then sat on "still confirming" forever.
   *
   * Once the booking is past pending that question is answered, and the other
   * payments with no scheduled_date are early payments made from the bookings
   * page, which are not this page's to reconcile. So Stripe is asked only
   * while the booking still waits on its checkout payment (the deposit, or
   * the whole price when paid in full), which is then the only row there is.
   */
  const alreadySettled = booking.status === "deposit_paid" || booking.status === "paid_in_full";
  const deposit = alreadySettled
    ? undefined
    : (booking.payments.find((p) => p.scheduled_date === null && p.stripe_payment_intent_id && p.status !== "canceled") ??
      booking.payments.find((p) => p.scheduled_date === null && p.stripe_payment_intent_id));

  // Re-check with Stripe directly rather than trusting DB state, which may
  // lag behind if the webhook hasn't landed yet (e.g. no local forwarding, or
  // a preview deployment, which Stripe never sends webhooks to). If it has
  // settled, syncPaymentFromStripe runs the webhook's own handler, so the
  // installments are scheduled and the confirmation email goes out exactly
  // as if the webhook had arrived, and once only if it arrives as well.
  const status = alreadySettled
    ? "succeeded"
    : deposit?.stripe_payment_intent_id
      ? ((await syncPaymentFromStripe(deposit.stripe_payment_intent_id))?.status ?? null)
      : null;

  // Reconciling may just have confirmed the booking and written its schedule,
  // so read it again rather than render the pending copy fetched above.
  if (!alreadySettled && status === "succeeded") {
    booking = (await loadBooking()).data ?? booking;
    // Settling can end in a cancellation: a checkout paid after its hold, whose
    // place had gone, is refunded and cancelled (lib/payments.ts).
    if (booking.status === "cancelled") {
      return <CancelledBooking booking={booking} />;
    }
  }

  const settled = status === "succeeded";
  const paidInFull = booking.status === "paid_in_full";
  // Chose to pay in full at booking: the checkout row is for the whole price.
  // Known before Stripe answers, so the pending copy can say "payment".
  const fullPlan =
    paidInFull || (deposit !== undefined && toCents(deposit.amount) >= toCents(Number(booking.total_amount)));
  const trip = booking.trips;
  const total = Number(booking.total_amount);
  const depositAmount = Number(booking.deposit_amount);
  const paid = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

  // Cancelled rows are installments an early payment covered; they are not
  // part of the schedule any more.
  // The trip page, where the three things we need straight away are done:
  // flights, a roommate request and traveler details. Asked for here, at the
  // moment of booking, not days later by email. Null when the portal is
  // switched off (no PORTAL_TOKEN_SECRET), and then the block is left out.
  // A cancelled booking never gets here (CancelledBooking, above), so a signed
  // link to a trip the traveler is not going on is never handed out.
  const portalUrl = settled ? createPortalUrl(booking.id) : null;

  const installments = booking.payments
    .filter((p) => p.scheduled_date && p.status !== "canceled")
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  // Before anything clears, the balance after the checkout charge; after, what
  // has actually cleared, since an early payment or a payment in full leaves
  // less owed than total less deposit.
  const balanceLeft = settled ? remaining : Math.max(0, total - (fullPlan ? total : depositAmount));

  // A penthouse booking gets the group's fill progress and its invite link in
  // place of the plain group code block. Counts only; see getPenthouseProgress.
  const penthouse =
    booking.group_code
      ? (await getPenthouseProgress(createAdminClient(), [booking])).get(booking.id)
      : undefined;

  return (
    <main>
      <section className="shell max-w-[48rem] pb-16 pt-12 md:pb-24 md:pt-20">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <p className="stamp-type text-[--text-muted]">
              {settled ? (paidInFull ? "Paid in full" : "Deposit received") : "Payment pending"}
            </p>
            <h1 className="t-title mt-5 max-w-[18ch] text-[--text]">
              {settled
                ? // "Telluride, Colorado" reads as "Telluride" in a headline.
                  trip
                  ? `You're going to ${trip.destination.split(",")[0]}`
                  : "You're going"
                : fullPlan
                  ? "Confirming your payment"
                  : "Confirming your deposit"}
            </h1>
            <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
              {settled
                ? paidInFull
                  ? `${trip ? `${formatDateRange(trip.start_date, trip.end_date)}. ` : ""}${formatAmount(paid)} is in, your spot is yours, and nothing more is owed. A confirmation is on its way to ${user.email}.`
                  : `${trip ? `${formatDateRange(trip.start_date, trip.end_date)}. ` : ""}Your ${formatAmount(depositAmount)} deposit is in and your spot is yours. A confirmation is on its way to ${user.email}.`
                : "Your bank has the charge and we are waiting on the result. This page updates on refresh, and nothing is owed twice."}
            </p>
          </div>

          {settled && trip && (
            <Stamp
              text={`${trip.destination} / Booked`}
              className="hidden w-28 shrink-0 text-[--accent] sm:block"
            />
          )}
        </div>

        {!settled && (
          <div className="mt-8">
            <Alert tone="info" title="Still confirming">
              Stripe currently reports this payment as {status ?? "unknown"}. Give it a moment and
              refresh. If it has not cleared within an hour,{" "}
              <Link href="/contact" className="text-[--accent] decoration-[--accent]">
                let us know
              </Link>
              .
            </Alert>
          </div>
        )}

        {/* -- the payment summary ------------------------------------------- */}

        <section className="mt-12" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="t-rule-label text-[--text]">
            Your booking
          </h2>

          {trip && (
            <Facts
              className="mt-6"
              items={[
                { label: "Trip", value: trip.name },
                { label: "Dates", value: formatDateRange(trip.start_date, trip.end_date) },
                { label: "Package", value: booking.tiers ? tierDisplayName(booking.tiers.name) : "Your package" },
                { label: "Confirmation", value: confirmationNumber(booking.id) },
              ]}
            />
          )}

          <Facts
            size="l"
            columns={2}
            className="mt-8 border-t border-[--rule] pt-6"
            items={[
              { label: settled ? "Paid" : "Being charged", value: formatAmount(settled ? paid : fullPlan ? total : depositAmount) },
              { label: "Left to pay", value: formatAmount(balanceLeft), note: `of ${formatAmount(total)}` },
            ]}
          />

          {installments.length > 0 ? (
            <div className="mt-8">
              <ScheduleTable
                caption="Scheduled payments"
                rows={installments.map((p) => ({
                  key: p.id,
                  date: p.scheduled_date ? formatDay(p.scheduled_date) : "Date to be set",
                  amount: formatAmount(Number(p.amount)),
                }))}
              />
              <p className="mt-5 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                {/* Says "after", not "before": nothing in lib/email/send.ts or
                    the installment cron sends advance notice. The three
                    installment emails (received, failed, action required) all
                    go out after an attempt, so promising a heads-up here would
                    be a promise the system does not keep. */}
                Each one is taken from the card you just used. You get an email each time one goes
                through, and straight away if one does not.
              </p>
            </div>
          ) : (
            <p className="mt-8 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              {fullPlan
                ? "Nothing is scheduled. The trip is paid for, so no more charges are taken from your card."
                : "Your payment schedule appears here once the deposit clears. It splits the balance into two dated payments before departure."}
            </p>
          )}
        </section>

        {/* -- next, today ----------------------------------------------------
            The trip page, where the three things we need straight away are
            done. The one dark panel on the page, because after the receipt it
            is the only thing left to act on. */}

        {portalUrl && (
          <section
            className="scheme-espresso scheme-paint mt-14 px-5 py-8 sm:px-9 sm:py-10"
            aria-labelledby="next-heading"
          >
            <p className="t-label text-[--accent]">Next, today</p>
            <h2 id="next-heading" className="t-heading mt-4 max-w-[20ch] text-[--text]">
              Three things for your trip page
            </h2>
            <ol className="mt-7 flex list-none flex-col border-t border-[--rule] p-0">
              {NEXT_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4 border-b border-[--rule] py-4">
                  <span aria-hidden="true" className="t-micro mt-1 w-5 shrink-0 tabular-nums text-[--text-muted]">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-body text-body font-medium text-[--text]">{step.title}</span>
                    <span className="mt-1 block font-body text-body-s leading-[1.6] text-[--text-secondary]">
                      {step.why}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 font-body text-body-s text-[--text-secondary]">
              About five minutes, all on one page.
            </p>
            <div className="mt-7">
              <Button href={portalUrl} variant="primary" size="lg" className="w-full sm:w-auto">
                Open your trip page
              </Button>
            </div>
          </section>
        )}

        {penthouse && booking.group_code ? (
          <PenthouseProgress
            className="mt-10"
            initial={toSnapshot(penthouse)}
            renderedAt={new Date().toISOString()}
            tierId={booking.tier_id}
            groupCode={booking.group_code}
            invitePath={penthouseInvitePath(booking.trip_id, booking.tier_id, booking.group_code)}
          />
        ) : booking.group_code && (
          <div className="mt-10 flex flex-col gap-3 border border-[--rule] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
            <div className="min-w-0">
              <p className="t-micro text-[--text-secondary]">Bring your friends</p>
              <p className="mt-2 max-w-[44ch] font-body text-body-s leading-[1.7] text-[--text-secondary]">
                Share your group code with anyone booking this trip and you are placed together.
              </p>
            </div>
            <p className="shrink-0 font-display text-display-s font-medium tracking-label text-[--text]">
              {booking.group_code}
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[--rule] pt-6">
          <Button href="/bookings" variant={portalUrl ? "secondary" : "primary"} size="md">
            Go to your bookings
          </Button>
          <Button href="/trips" variant="ghost" size="md" className="ml-3 min-h-11">
            Browse trips
          </Button>
        </div>
      </section>
    </main>
  );
}

/*
 * What the trip page asks for, and why now. The reasons are the ones this page
 * already gave in a paragraph; split out so each task is scannable.
 */
const NEXT_STEPS = [
  { title: "Book your flights", why: "Montrose has a handful of winter flights a day. Book before they're gone." },
  { title: "Request your roommates", why: "Rooms are assigned in the order requests arrive." },
  {
    title: "Add your traveler details",
    why: "Your name and date of birth go on your lift tickets and lodging records, and your sizes get your ski or snowboard rentals fitted before you land.",
  },
];

type ConfirmationBooking = {
  id: string;
  total_amount: number;
  trips: { name: string; destination: string; start_date: string; end_date: string } | null;
  tiers: { name: string } | null;
  payments: { status: string; amount: number }[];
};

/**
 * A cancelled booking, said plainly: no "spot is held", no schedule, no trip
 * page link. What was paid and kept is shown to the cent, and anything owed
 * back is a person's to settle, so the page points at one.
 */
function CancelledBooking({ booking }: { booking: ConfirmationBooking }) {
  const trip = booking.trips;
  const kept = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);
  return (
    <main>
      <section className="shell max-w-[48rem] pb-16 pt-12 md:pb-24 md:pt-20">
        <p className="stamp-type text-[--text-muted]">Canceled</p>
        <h1 className="t-title mt-5 max-w-[18ch] text-[--text]">This booking is canceled</h1>
        <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          It no longer holds a place on the trip, and nothing more will be taken from your card. If you
          are owed a refund, we will be in touch by email. Questions,{" "}
          <Link href="/contact" className="text-[--accent] decoration-[--accent]">
            get in touch
          </Link>
          .
        </p>

        {trip && (
          <Facts
            className="mt-12"
            items={[
              { label: "Trip", value: trip.name },
              { label: "Dates", value: formatDateRange(trip.start_date, trip.end_date) },
              { label: "Package", value: booking.tiers ? tierDisplayName(booking.tiers.name) : "Your package" },
              { label: "Confirmation", value: confirmationNumber(booking.id) },
            ]}
          />
        )}
        {kept > 0 && (
          <Facts
            size="l"
            columns={2}
            className="mt-8 border-t border-[--rule] pt-6"
            items={[{ label: "Paid and not refunded", value: formatAmount(kept / 100) }]}
          />
        )}

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[--rule] pt-6">
          <Button href="/bookings" variant="primary" size="md">
            Go to your bookings
          </Button>
          <Button href="/trips" variant="ghost" size="md" className="ml-3 min-h-11">
            Browse trips
          </Button>
        </div>
      </section>
    </main>
  );
}
