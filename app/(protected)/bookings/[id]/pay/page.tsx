import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Badge, Button, SectionDivider } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";
import CheckoutForm from "@/components/CheckoutForm";

/**
 * The deposit screen.
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
      "id, status, total_amount, deposit_amount, trips(name, destination, start_date, end_date), tiers(name), payments(stripe_payment_intent_id)"
    )
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  if (booking.status !== "pending") {
    redirect(`/bookings/${booking.id}/confirmation`);
  }

  const payment = booking.payments[0];
  if (!payment?.stripe_payment_intent_id) {
    notFound();
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  const trip = booking.trips;
  const total = Number(booking.total_amount);
  const depositAmount = Number(booking.deposit_amount);
  const balance = Math.max(0, Math.round((total - depositAmount) * 100) / 100);
  const schedule = previewInstallments(total, depositAmount, trip?.start_date);

  return (
    <main>
      <section className="shell max-w-[52rem] py-14 md:py-20">
        <p className="stamp-type text-[--text-muted]">Checkout</p>
        <h1 className="t-title mt-5 max-w-[16ch] text-[--text]">Pay your deposit</h1>
        <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          One charge now holds your spot. The balance is split into two dated payments taken from
          the same card, and nothing else comes off it today.
        </p>

        {trip && (
          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[--rule] pt-8 lg:grid-cols-4">
            <Fact label="Trip" value={trip.name} />
            <Fact label="Dates" value={formatDateRange(trip.start_date, trip.end_date)} numeric />
            <Fact label="Package" value={booking.tiers?.name ?? "Standard"} />
            <Fact label="Destination" value={trip.destination} />
          </dl>
        )}

        {/* -- what comes off the card right now ------------------------------ */}

        <div className="mt-10 border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="stamp-type text-[--text-muted]">Charged today</p>
            <Badge tone="urgent">Due now</Badge>
          </div>

          <p className="mt-6 font-display text-display-l tabular-nums tracking-display text-[--text]">
            {formatPrice(depositAmount)}
          </p>

          <p className="mt-5 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
            This is the deposit, not the price of the trip. The trip is{" "}
            <span className="tabular-nums text-[--text]">{formatPrice(total)}</span>, so{" "}
            <span className="tabular-nums text-[--text]">{formatPrice(balance)}</span> is still owed
            after today.
          </p>
        </div>

        {/* -- and what comes off it later ------------------------------------ */}

        {schedule.length > 0 && (
          <div className="mt-6 border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
            <p className="stamp-type text-[--text-muted]">Charged later</p>

            <ul className="mt-5 flex list-none flex-col p-0">
              {schedule.map((row) => (
                <li
                  key={row.offsetDays}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[--rule-faint] py-4 last:border-0"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-body-s tabular-nums tracking-title text-[--text]">
                      {formatDay(row.date)}
                    </span>
                    <span className="t-micro mt-2 block text-[--text-secondary]">
                      {row.offsetDays} days before the trip
                    </span>
                  </span>
                  <span className="font-display text-display-s tabular-nums tracking-title text-[--text]">
                    {formatPrice(row.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Both are charged automatically to the card you enter below, on the dates above. You
              get an email each time one goes through, and the schedule stays on your bookings page.
            </p>
          </div>
        )}

        <div className="mt-6">
          <Alert tone="warning" title="The deposit is non-refundable">
            Once this payment clears, the deposit is not refundable, whatever the reason for
            canceling. Anything you pay above it is refunded on a sliding scale that closes 30 days
            before the trip. Read the{" "}
            <Link href="/terms#cancellation" className="text-[--accent] decoration-[--accent]">
              cancellation terms
            </Link>{" "}
            before you pay.
          </Alert>
        </div>

        {/* -- the card field -------------------------------------------------- */}

        <SectionDivider variant="rule" className="mt-12" />

        <section className="mt-12">
          <h2 className="t-heading text-[--text]">Payment</h2>
          <p className="mt-4 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
            The card you use here is the card the two payments above are taken from. You can change
            it later by getting in touch.
          </p>

          <CheckoutForm
            clientSecret={paymentIntent.client_secret!}
            bookingId={booking.id}
            amountLabel={formatPrice(depositAmount)}
          />
        </section>

        <div className="mt-10 border-t border-[--rule] pt-8">
          <Button href="/bookings" variant="ghost" size="sm" className="text-[--text-secondary]">
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

function Fact({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="stamp-type text-[--text-muted]">{label}</dt>
      <dd
        className={`mt-3 break-words font-display text-display-s tracking-title text-[--text] ${
          numeric ? "tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
