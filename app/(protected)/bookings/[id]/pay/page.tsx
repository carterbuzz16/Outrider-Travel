import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, AmountDue, Button, Facts, ScheduleTable } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { paymentKindOf } from "@/lib/payments";
import { syncPaymentFromStripe } from "@/lib/stripe-sync";
import { formatAmount } from "@/lib/balance";
import { PAY_IN_FULL_DISCOUNT } from "@/lib/deposit";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";
import CheckoutForm from "@/components/CheckoutForm";

/**
 * The deposit screen, or the whole-trip screen when the traveler chose to pay
 * in full at booking.
 *
 * Everything above the card field exists to answer the three questions a
 * traveler has with their wallet already out: what am I buying, what comes off
 * the card right now, and what happens to the rest. The reading order is the
 * DOM order — a single column, card field last — so the answers can't be
 * scrolled past on a narrow screen.
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
      "id, status, total_amount, deposit_amount, trips(name, destination, start_date, end_date), tiers(name), payments(stripe_payment_intent_id, scheduled_date)"
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

  const trip = booking.trips;
  const total = Number(booking.total_amount);
  const depositAmount = Number(booking.deposit_amount);
  const balance = Math.max(0, Math.round((total - depositAmount) * 100) / 100);

  // Which plan was picked at booking is read off the intent itself (set by
  // createBooking), not from anything the browser sends. A payment in full
  // has no schedule to preview; total_amount already has the discount off.
  const payingInFull = paymentKindOf(paymentIntent) === "full";
  const schedule = payingInFull ? [] : previewInstallments(total, depositAmount, trip?.start_date);
  const dueToday = payingInFull ? total : depositAmount;

  return (
    <main>
      <section className="shell max-w-[48rem] pb-16 pt-12 md:pb-24 md:pt-20">
        <p className="stamp-type text-[--text-muted]">Checkout</p>
        <h1 className="t-title mt-5 max-w-[16ch] text-[--text]">
          {payingInFull ? "Pay for your trip" : "Pay your deposit"}
        </h1>

        {/* -- what is being bought ------------------------------------------ */}

        {trip && (
          <Facts
            className="mt-10 border-t border-[--rule] pt-6"
            items={[
              { label: "Trip", value: trip.name },
              { label: "Dates", value: formatDateRange(trip.start_date, trip.end_date) },
              { label: "Package", value: booking.tiers?.name ?? "Standard" },
              { label: "Trip price", value: formatAmount(total) },
            ]}
          />
        )}

        {/* -- what comes off the card right now ------------------------------ */}

        <AmountDue label="Charged today" amount={formatAmount(dueToday)} className="mt-10">
          {payingInFull ? (
            <p>
              The whole trip
              {PAY_IN_FULL_DISCOUNT > 0 && `, with ${formatPrice(PAY_IN_FULL_DISCOUNT)} off for paying it all now`}
              . Nothing else is taken from your card later.
            </p>
          ) : (
            <p>
              This is the deposit, not the price of the trip. It holds your spot, and the other{" "}
              <span className="tabular-nums text-[--text]">{formatAmount(balance)}</span> is taken
              later, on the dates below. Nothing else comes off your card today.
            </p>
          )}
        </AmountDue>

        {/* -- and what comes off it later ------------------------------------ */}

        {schedule.length > 0 && (
          <div className="mt-10">
            <ScheduleTable
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
            <p className="mt-5 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              The later payments are charged automatically to the card you enter below, on those
              dates. You get an email each time one goes through, and the schedule stays on your
              bookings page.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Alert tone="warning" title="The deposit is non-refundable">
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
            <Link href="/terms#cancellation" className="text-[--accent] decoration-[--accent]">
              cancellation terms
            </Link>{" "}
            before you pay.
          </Alert>
        </div>

        {/* -- the card field -------------------------------------------------- */}

        <section className="mt-14 border-t border-[--rule-strong] pt-10" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="t-heading text-[--text]">
            Payment
          </h2>
          <p className="mt-3 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
            {payingInFull
              ? "This is the only charge on the booking. The card is not kept for later payments."
              : "The card you use here is the card the scheduled payments are taken from. You can change it later by getting in touch."}
          </p>

          <CheckoutForm
            clientSecret={paymentIntent.client_secret!}
            bookingId={booking.id}
            amountLabel={formatAmount(dueToday)}
            submitLabel={payingInFull ? `Pay ${formatAmount(dueToday)}` : undefined}
            scheduledCharges={schedule.map((row) => ({
              dateLabel: formatDay(row.date),
              amountLabel: formatAmount(row.amount),
            }))}
          />
        </section>

        <div className="mt-12 border-t border-[--rule] pt-6">
          <Button href="/bookings" variant="ghost" size="sm" className="min-h-11 text-[--text-secondary]">
            Back to your bookings
          </Button>
        </div>
      </section>
    </main>
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
