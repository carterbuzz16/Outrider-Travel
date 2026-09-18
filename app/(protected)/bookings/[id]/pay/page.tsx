import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoomPanel, ScheduleTable } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chooseAgainPath, isStalePending, recheckStaleCheckout, staleCheckoutMessage } from "@/lib/stale-checkout";
import { getStripe } from "@/lib/stripe";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { paymentKindOf } from "@/lib/payments";
import { syncPaymentFromStripe } from "@/lib/stripe-sync";
import { formatAmount } from "@/lib/balance";
import { DEPOSIT_PERCENTAGE, PAY_IN_FULL_DISCOUNT } from "@/lib/deposit";
import { getRoomMedia } from "@/lib/room-media";
import { CONTACT } from "@/lib/site-content";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";
import { tierDisplayName } from "@/lib/tier-display";
import CheckoutForm from "@/components/CheckoutForm";
import CheckoutSteps from "@/components/CheckoutSteps";
import { PENTHOUSE_DISCLAIMER } from "@/lib/penthouse";

/**
 * Step 2 of checkout: the deposit, or the whole trip when the traveler chose
 * to pay in full.
 *
 * Two columns from lg up, the same shape as step 1: the card on the left, and
 * on the right the order it pays for, which answers the three questions a
 * traveler has with their wallet out: what am I buying, what comes off the
 * card right now, and what happens to the rest. On a phone the heading, then
 * the order, come before the card field in the DOM and on screen, so none of
 * that can be scrolled past on the way to paying.
 *
 * The one checkbox for the whole checkout is here, above the pay button:
 * agreement to the Terms and the Assumption of Risk, and authorization of the
 * charges (components/AuthorizeCharge.tsx). CheckoutForm records the agreement
 * before it confirms the card.
 */
export default async function PayPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, created_at, total_amount, deposit_amount, trips(name, destination, start_date, end_date), tiers(name, price, group_exclusive), payments(stripe_payment_intent_id, scheduled_date)"
    )
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  if (booking.status !== "pending") {
    redirect(`/bookings/${booking.id}/confirmation`);
  }

  // The checkout row: the one with no scheduled date. A pending booking has no
  // other, but reading it by shape rather than position costs nothing.
  const payment = booking.payments.find((p) => p.scheduled_date === null && p.stripe_payment_intent_id);
  if (!payment?.stripe_payment_intent_id) {
    notFound();
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  // Already paid, and the booking just does not know it yet (a late webhook,
  // or a preview deployment that never gets one). Showing the card form again
  // would invite a second payment, so settle it here and move on.
  if (paymentIntent.status === "succeeded" || paymentIntent.status === "processing") {
    if (paymentIntent.status === "succeeded") await syncPaymentFromStripe(paymentIntent);
    redirect(`/bookings/${booking.id}/confirmation`);
  }

  // A checkout opened more than 30 minutes ago no longer holds its bed. If
  // the package filled up, or another group took the penthouse, in that time,
  // the checkout is released here rather than offered a card form it could
  // overfill the tier with (lib/stale-checkout.ts). Otherwise it carries on.
  if (isStalePending(booking)) {
    const stale = await recheckStaleCheckout(createAdminClient(), booking.id);
    if (!stale.ok) redirect(chooseAgainPath(stale.tripId, staleCheckoutMessage(stale.reason)));
  }

  const trip = booking.trips;
  const tierName = booking.tiers ? tierDisplayName(booking.tiers.name) : "Your package";
  const room = booking.tiers ? getRoomMedia(booking.tiers.name) : null;
  const photo = room?.photos[0] ?? null;
  const total = Number(booking.total_amount);
  const depositAmount = Number(booking.deposit_amount);
  const balance = Math.max(0, Math.round((total - depositAmount) * 100) / 100);

  // Which plan was picked at booking is read off the intent itself (set by
  // createBooking), not from anything the browser sends. A payment in full
  // has no schedule to preview; total_amount already has the discount off.
  const payingInFull = paymentKindOf(paymentIntent) === "full";
  const schedule = payingInFull ? [] : previewInstallments(total, depositAmount, trip?.start_date);
  const dueToday = payingInFull ? total : depositAmount;
  // The tier's list price, for showing the pay-in-full saving as a line. Only
  // when it is really the difference; the booking row is what is charged.
  const listPrice = booking.tiers ? Number(booking.tiers.price) : null;
  // A tier repriced since booking would make the difference something else,
  // so it only shows when it is exactly what the discount can account for.
  const difference = listPrice !== null ? Math.round((listPrice - total) * 100) / 100 : 0;
  const saving = payingInFull && difference > 0 && difference <= PAY_IN_FULL_DISCOUNT ? difference : 0;

  return (
    <main>
      <div className="shell max-w-[76rem] pb-20 pt-8 md:pb-28 md:pt-12">
        <CheckoutSteps current={2} />

        {/* Above both columns, so on a phone the page opens on what it is for,
            then the order, then the card. */}
        <header className="mt-8 border-b border-[--rule] pb-6 md:mt-10">
          <h1 id="payment-heading" className="t-heading text-[--text]">
            {payingInFull ? "Pay for your trip" : "Pay your deposit"}
          </h1>
          <p className="mt-2 max-w-measure font-body text-body leading-[1.65] text-[--text-secondary]">
            {payingInFull ? (
              <>
                <span className="tabular-nums text-[--text]">{formatAmount(dueToday)}</span> today for the
                whole trip
                {PAY_IN_FULL_DISCOUNT > 0 && `, with ${formatPrice(PAY_IN_FULL_DISCOUNT)} off for paying it all now`}
                . Nothing else is taken from your card later, and the card isn&rsquo;t kept. Your
                place is held for 30 minutes while you pay.
              </>
            ) : (
              <>
                <span className="tabular-nums text-[--text]">{formatAmount(dueToday)}</span> today holds your
                spot. The two installments come off this same card, and you can change it later by getting
                in touch. Your place is held for 30 minutes while you pay.
              </>
            )}
          </p>
        </header>

        <div className="mt-8 grid items-start gap-10 md:mt-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12 xl:gap-16">
          {/* -- the order ------------------------------------------------------ */}
          <aside
            aria-labelledby="order-heading"
            className="border border-[--rule] bg-[--surface-raised] lg:sticky lg:top-8 lg:order-2"
          >
            <h2 id="order-heading" className="sr-only">
              Your order
            </h2>

            <div className="flex gap-4 border-b border-[--rule] p-5 sm:p-6">
              {room && (
                <div className="w-28 shrink-0 sm:w-32">
                  {photo ? (
                    <div className="relative aspect-[3/2] overflow-hidden bg-[--surface-inset]">
                      <Image src={photo.src} alt={photo.alt} fill sizes="8rem" className="object-cover" />
                    </div>
                  ) : (
                    <RoomPanel room={room} size="thumb" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-display text-display-s font-medium tracking-title text-[--text]">{tierName}</p>
                {room && (
                  <p className="mt-0.5 font-body text-body-s leading-[1.5] text-[--text-secondary]">{room.summary}</p>
                )}
              </div>
            </div>

            {trip && (
              <dl className="m-0 flex flex-col gap-2.5 border-b border-[--rule] p-5 font-body text-body-s sm:p-6">
                <Line label="Trip" value={trip.name} />
                <Line label="Dates" value={formatDateRange(trip.start_date, trip.end_date)} />
                <Line
                  label="Plan"
                  value={payingInFull ? "Paid in full" : `${Math.round(DEPOSIT_PERCENTAGE * 100)}% deposit`}
                />
              </dl>
            )}

            <div className="p-5 sm:p-6">
              <dl className="m-0 flex flex-col gap-2.5 font-body text-body-s">
                {saving > 0 && listPrice !== null ? (
                  <>
                    <Line label="Trip price" value={formatAmount(listPrice)} />
                    <Line label="Paying in full" value={`−${formatAmount(saving)}`} />
                  </>
                ) : (
                  <Line label="Trip price" value={formatAmount(total)} />
                )}
                {!payingInFull && <Line label="Paid later" value={formatAmount(balance)} />}
                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[--rule-strong] pt-4">
                  <dt className="font-body text-body font-medium text-[--text]">Due today</dt>
                  <dd className="m-0 font-display text-display-s font-medium tabular-nums tracking-title text-[--text]">
                    {formatAmount(dueToday)}
                  </dd>
                </div>
              </dl>

              {schedule.length > 0 && (
                <ScheduleTable
                  className="mt-7"
                  caption="Your payment schedule"
                  rows={[
                    { key: "today", date: "Today", note: "Deposit", amount: formatAmount(depositAmount), current: true },
                    ...schedule.map((row) => ({
                      key: String(row.offsetDays),
                      date: formatDay(row.date),
                      note: `${row.offsetDays} days before the trip`,
                      amount: formatAmount(row.amount),
                    })),
                  ]}
                  total={{ label: "Trip total", amount: formatAmount(total) }}
                />
              )}

              {/* The same disclosure the page has always carried, set as a
                  note in the order rather than a warning box: it is a term of
                  the purchase, not an alarm. */}
              <p className="mt-6 border-t border-[--rule] pt-5 font-body text-body-s leading-[1.65] text-[--text-secondary]">
                <span className="font-medium text-[--text]">The deposit is non-refundable. </span>
                {payingInFull ? (
                  <>
                    Of this payment, <span className="tabular-nums">{formatAmount(depositAmount)}</span> is
                    the deposit, and once it clears that part is not refundable, whatever the reason for
                    canceling. The rest is refunded on a sliding scale that closes 30 days before the
                    trip.
                  </>
                ) : (
                  <>
                    Once this payment clears, the deposit is not refundable, whatever the reason for
                    canceling. Anything you pay above it is refunded on a sliding scale that closes 30
                    days before the trip.
                  </>
                )}{" "}
                Read the{" "}
                <Link href="/terms#cancellation" target="_blank" rel="noreferrer" className={LINK}>
                  cancellation terms
                </Link>{" "}
                before you pay.
              </p>
            </div>
          </aside>

          {/* -- the card ------------------------------------------------------- */}
          <section aria-label="Card details" className="min-w-0 lg:order-1">
            {/* The penthouse fill rule, read before the card is. Copy only;
                nothing about the charge changes (PENTHOUSE_DISCLAIMER). */}
            {booking.tiers?.group_exclusive && (
              <p className="mb-6 border-l-2 border-[--rule-strong] pl-4 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                {PENTHOUSE_DISCLAIMER}
              </p>
            )}
            <CheckoutForm
              clientSecret={paymentIntent.client_secret!}
              bookingId={booking.id}
              amountLabel={formatAmount(dueToday)}
              submitLabel={payingInFull ? `Pay ${formatAmount(dueToday)}` : undefined}
              acceptTerms
              scheduledCharges={schedule.map((row) => ({
                dateLabel: formatDay(row.date),
                amountLabel: formatAmount(row.amount),
              }))}
            />

            <div className="mt-10 flex flex-col gap-3 border-t border-[--rule] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/bookings"
                className="inline-flex min-h-11 items-center font-body text-body-s text-[--text-secondary] underline underline-offset-4 hover:text-[--text]"
              >
                Back to your bookings
              </Link>
              <p className="font-body text-body-s text-[--text-secondary]">
                Questions?{" "}
                <a href={`mailto:${CONTACT.email}`} className={LINK}>
                  {CONTACT.email}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[--text-secondary]">{label}</dt>
      <dd className="m-0 min-w-0 text-right tabular-nums text-[--text]">{value}</dd>
    </div>
  );
}

/**
 * The schedule the traveler is about to agree to, worked out the same way
 * lib/installments.ts will work it out for real.
 *
 * The rows do not exist yet: they are written only once the deposit's
 * payment_intent.succeeded webhook lands, which is after this page. So this
 * mirrors that module's split (even halves, last one absorbing the rounding
 * remainder) and its offsets rather than inventing a second set of numbers.
 * Display only — nothing here is persisted, and if the two ever drift the
 * booking follows lib/installments.ts, not this.
 */
function previewInstallments(total: number, deposit: number, startDate: string | undefined) {
  const remaining = Math.round((total - deposit) * 100) / 100;
  if (remaining <= 0 || !startDate) return [];

  const n = INSTALLMENT_OFFSETS_DAYS.length;
  const base = Math.floor((remaining / n) * 100) / 100;
  const amounts = Array(n).fill(base);
  amounts[n - 1] = Math.round((remaining - base * (n - 1)) * 100) / 100;

  return INSTALLMENT_OFFSETS_DAYS.map((offsetDays, i) => {
    // start_date is a bare YYYY-MM-DD, which Date parses as UTC midnight, so
    // the subtraction has to be UTC too or a westward timezone lands a day out.
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() - offsetDays);
    return { offsetDays, amount: amounts[i] as number, date: date.toISOString().slice(0, 10) };
  });
}
