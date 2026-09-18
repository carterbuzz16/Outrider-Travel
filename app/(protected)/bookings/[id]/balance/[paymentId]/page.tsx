import { notFound, redirect } from "next/navigation";
import { Alert, Badge, Button, SectionDivider } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { paymentKindOf } from "@/lib/payments";
import { syncPaymentFromStripe } from "@/lib/stripe-sync";
import { formatAmount, fromCents, owedCents, toCents } from "@/lib/balance";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange } from "@/lib/trips";
import CheckoutForm from "@/components/CheckoutForm";

/**
 * The card screen for an early payment toward a booking's balance.
 *
 * Built the same way as the installment verification page next to it: the
 * route names the payment row, RLS decides whether this traveler may see it,
 * and the PaymentIntent is read from Stripe rather than trusted from the row.
 * The row and its intent are created by startBalancePayment when the traveler
 * picks an amount on the bookings page; this page only takes the card.
 *
 * It also answers the question the traveler is really asking, which is what
 * happens to the payments already on the calendar. The preview below works
 * that out the way lib/installments.ts will once Stripe confirms the charge:
 * earliest first, the ones covered dropped, the one partly covered reduced.
 * Display only; the webhook does the real thing.
 *
 * After a successful charge, CheckoutForm returns here with ?paid=1, and the
 * page shows the payment as received. If the webhook has not recorded it yet,
 * the page runs the webhook's own handler for it (syncPaymentFromStripe), so
 * the schedule still changes in exactly one place, whichever gets there first.
 */
export default async function BalancePaymentPage(props: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view payments for own bookings") scopes this to the
  // signed-in user's own bookings, so a mismatched id just comes back empty.
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, status, amount, scheduled_date, stripe_payment_intent_id, booking_id, bookings(status, total_amount, trips(name, start_date, end_date), tiers(name), payments(id, status, amount, scheduled_date))"
    )
    .eq("id", params.paymentId)
    .eq("booking_id", params.id)
    .single();

  // Only a row this flow wrote: no scheduled date, and an intent to pay it with.
  if (!payment || payment.scheduled_date !== null || !payment.stripe_payment_intent_id || !payment.bookings) {
    notFound();
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  // The deposit row also has no scheduled date; this page is not for it.
  if (paymentKindOf(paymentIntent) !== "balance" || paymentIntent.metadata.bookingId !== params.id) {
    notFound();
  }

  // Paid, but the row does not know yet: the webhook is late, or this is a
  // preview deployment that never gets one. Settle it now through the
  // webhook's own handler (lib/stripe-sync.ts), so the schedule is reduced and
  // the receipt goes out without waiting. Safe if the webhook lands at the
  // same moment; only one of the two does the work.
  if (payment.status === "pending" && paymentIntent.status === "succeeded") {
    await syncPaymentFromStripe(paymentIntent);
  }

  const booking = payment.bookings;
  const trip = booking.trips;
  const amount = paymentIntent.amount / 100;
  const received = payment.status === "succeeded" || paymentIntent.status === "succeeded";
  // A bank debit can sit in processing for days. The form cannot take a second
  // go at it, so the page says so and waits.
  const processing = !received && paymentIntent.status === "processing";

  if (!received && !processing) {
    // Replaced by a newer attempt, or the booking has moved on (cancelled, or
    // paid off some other way). Either way this card form must not take money.
    if (payment.status !== "pending" || booking.status !== "deposit_paid" || paymentIntent.status === "canceled") {
      redirect(
        "/bookings?error=" +
          encodeURIComponent("That payment is no longer open. Start a new one from your booking if you still want to pay."),
      );
    }
  }

  const owedBefore = owedCents(booking.total_amount, booking.payments.filter((p) => p.id !== payment.id));
  const owedAfter = Math.max(0, owedBefore - toCents(amount));

  // The balance can shrink after this form was opened (a scheduled payment
  // went through). Paying the old figure then would pay more than is owed, so
  // the traveler starts again from the current number instead.
  if (!received && !processing && toCents(amount) > owedBefore) {
    redirect(
      "/bookings?error=" +
        encodeURIComponent("Your balance has changed since you started this payment. Start a new one from your booking."),
    );
  }
  const schedule = previewSchedule(booking.payments, toCents(amount));

  return (
    <main>
      <section className="shell max-w-[52rem] py-14 md:py-20">
        <p className="stamp-type text-[--text-muted]">
          {received ? "Payment received" : processing ? "Payment processing" : "Pay toward your balance"}
        </p>
        <h1 className="t-title mt-5 max-w-[18ch] text-[--text]">
          {received
            ? "Thank you, that is in"
            : processing
              ? "Your payment is on its way"
              : `Pay ${formatAmount(amount)} now`}
        </h1>
        <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          {received
            ? owedAfter > 0
              ? `${formatAmount(amount)} has been paid toward ${trip?.name ?? "your trip"}. Your scheduled payments are being reduced to match, and your bookings page shows the new amounts within a minute or two. A receipt is on its way to ${user.email}.`
              : `${formatAmount(amount)} has been paid toward ${trip?.name ?? "your trip"}, and that covers the rest of it. No more payments will be taken. A receipt is on its way to ${user.email}.`
            : processing
              ? `Your bank is still processing ${formatAmount(amount)}. Once it clears, it comes off your scheduled payments and a receipt reaches your inbox. Nothing more is needed from you.`
              : "This comes off the payments already scheduled on your booking, earliest first. Nothing is charged until you pay below."}
        </p>

        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[--rule] pt-8 lg:grid-cols-4">
          <Fact label="Trip" value={trip?.name ?? "Your booking"} />
          <Fact
            label="Dates"
            value={trip ? formatDateRange(trip.start_date, trip.end_date) : "On your booking"}
            numeric={Boolean(trip)}
          />
          <Fact label={received ? "Owed before" : "Owed now"} value={formatAmount(fromCents(owedBefore))} numeric />
          <Fact label={received ? "Owed now" : "Owed after"} value={formatAmount(fromCents(owedAfter))} numeric />
        </dl>

        {!received && (
          <>
            <div className="mt-10 border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <p className="stamp-type text-[--text-muted]">Your schedule after this</p>
                <Badge tone="open">{owedAfter > 0 ? "Reduced" : "Paid off"}</Badge>
              </div>

              {schedule.length > 0 ? (
                <ul className="mt-5 flex list-none flex-col p-0">
                  {schedule.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[--rule-faint] py-4 last:border-0"
                    >
                      <span className="min-w-0">
                        <span className="block font-display font-medium text-body-s tabular-nums tracking-title text-[--text]">
                          {row.date ? formatDay(row.date) : "Date to be set"}
                        </span>
                        <span className="t-micro mt-2 block text-[--text-secondary]">
                          {row.after === 0
                            ? "No longer charged"
                            : row.after < row.before
                              ? `Was ${formatAmount(fromCents(row.before))}`
                              : "Unchanged"}
                        </span>
                      </span>
                      <span className="font-display font-medium text-display-s tabular-nums tracking-title text-[--text]">
                        {row.after === 0 ? (
                          <s className="text-[--text-muted]">{formatAmount(fromCents(row.before))}</s>
                        ) : (
                          formatAmount(fromCents(row.after))
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  No payments are scheduled on this booking.
                </p>
              )}

              <p className="mt-6 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                {owedAfter > 0
                  ? "Anything still scheduled is taken from the card saved with your deposit, on the dates above."
                  : "With this payment the trip is paid for, and nothing more is taken from your card."}
              </p>
            </div>

            {!processing && (
              <>
                <SectionDivider variant="rule" className="mt-12" />

                <section className="mt-12">
                  <h2 className="t-heading text-[--text]">Payment</h2>
                  <p className="mt-4 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
                    Use any card. This payment does not change the card your scheduled payments come
                    from.
                  </p>

                  <CheckoutForm
                    clientSecret={paymentIntent.client_secret!}
                    bookingId={params.id}
                    amountLabel={formatAmount(amount)}
                    submitLabel={`Pay ${formatAmount(amount)}`}
                    returnPath={`/bookings/${params.id}/balance/${payment.id}?paid=1`}
                  />
                </section>
              </>
            )}
          </>
        )}

        {received && (
          <div className="mt-10">
            <Alert tone="info" title="What happens to your schedule">
              {owedAfter > 0
                ? "The payment comes off your next scheduled payments, earliest first. Any it covers in full are dropped, and the rest are taken on their dates as before."
                : "Every scheduled payment still on the booking is dropped. Your bookings page will show it as paid in full."}
            </Alert>
          </div>
        )}

        <div className="mt-10 border-t border-[--rule] pt-8">
          <Button href="/bookings" variant={received ? "primary" : "ghost"} size="sm" className={received ? undefined : "text-[--text-secondary]"}>
            Back to your bookings
          </Button>
        </div>
      </section>
    </main>
  );
}

/**
 * The open installments as they will look once this payment lands, worked out
 * the same way reconcileInstallments applies it: earliest first, each one
 * covered in full dropped, the one partly covered reduced. The real change is
 * made by the webhook, and if the two ever disagree the schedule follows
 * lib/installments.ts, not this.
 */
function previewSchedule(
  payments: { id: string; status: string; amount: number; scheduled_date: string | null }[],
  paymentCents: number,
) {
  let left = paymentCents;
  return payments
    .filter((p) => p.scheduled_date && ["scheduled", "requires_action", "failed"].includes(p.status))
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))
    .map((p) => {
      const before = toCents(p.amount);
      const taken = Math.min(before, left);
      left -= taken;
      return { id: p.id, date: p.scheduled_date, before, after: before - taken };
    });
}

function Fact({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="stamp-type text-[--text-muted]">{label}</dt>
      <dd
        className={`mt-3 break-words font-display font-medium text-display-s tracking-title text-[--text] ${
          numeric ? "tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
