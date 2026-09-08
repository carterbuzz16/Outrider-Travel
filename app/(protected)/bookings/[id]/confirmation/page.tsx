import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert, Button, SectionDivider, Stamp } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { reconcileDepositPayment } from "@/lib/payments";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";

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
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, total_amount, deposit_amount, group_code, trips(name, destination, start_date, end_date), tiers(name), payments(id, status, amount, scheduled_date, stripe_payment_intent_id)"
    )
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  /*
   * The deposit is the payment with no scheduled_date: installments are always
   * written with one (lib/installments.ts) and the deposit never is (see
   * bookings/actions.ts). The previous version took payments[0], which is
   * whatever order PostgREST returned — once installments existed on the
   * booking that could be an installment row with a null payment intent, and
   * the page then sat on "still confirming" forever.
   */
  const deposit = booking.payments.find(
    (p) => p.scheduled_date === null && p.stripe_payment_intent_id
  );

  // Re-check with Stripe directly rather than trusting DB state, which may
  // lag behind if the webhook hasn't landed yet (e.g. no local forwarding).
  const status = deposit?.stripe_payment_intent_id
    ? await reconcileDepositPayment(deposit.stripe_payment_intent_id)
    : null;

  const settled = status === "succeeded";
  const trip = booking.trips;
  const total = Number(booking.total_amount);
  const depositAmount = Number(booking.deposit_amount);

  const installments = booking.payments
    .filter((p) => p.scheduled_date)
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  return (
    <main>
      <section className="shell max-w-[52rem] py-14 md:py-20">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <p className="stamp-type text-[--text-muted]">
              {settled ? "Deposit received" : "Payment pending"}
            </p>
            <h1 className="t-title mt-5 max-w-[18ch] text-[--text]">
              {settled ? "Your spot is held" : "Confirming your deposit"}
            </h1>
            <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
              {settled
                ? `${formatPrice(depositAmount)} is in and the room is yours. A confirmation is on its way to ${user.email}.`
                : "Your bank has the charge and we are waiting on the result. This page updates on refresh, and nothing is owed twice."}
            </p>
          </div>

          {settled && trip && (
            <Stamp
              text={`${trip.destination} · Booked`}
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

        {trip && (
          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[--rule] pt-8 lg:grid-cols-4">
            <Fact label="Trip" value={trip.name} />
            <Fact label="Dates" value={formatDateRange(trip.start_date, trip.end_date)} />
            <Fact label="Package" value={booking.tiers?.name ?? "Standard"} />
            <Fact label="Group code" value={booking.group_code ?? "None"} />
          </dl>
        )}

        <SectionDivider variant="rule" className="mt-12" />

        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <h2 className="t-heading text-[--text]">What happens next</h2>

          <div className="flex flex-col gap-8">
            <div>
              <p className="stamp-type text-[--text-muted]">Balance</p>
              <p className="mt-3 font-display text-display-s tracking-title text-[--text]">
                {formatPrice(Math.max(0, total - depositAmount))}
                <span className="t-micro ml-2 text-[--text-secondary]">
                  of {formatPrice(total)} left
                </span>
              </p>
            </div>

            {installments.length > 0 ? (
              <div>
                <p className="stamp-type text-[--text-muted]">Scheduled payments</p>
                <ul className="mt-4 flex list-none flex-col p-0">
                  {installments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-baseline justify-between gap-6 border-b border-[--rule-faint] py-3.5 last:border-0"
                    >
                      <span className="font-body text-body-s text-[--text-secondary]">
                        {p.scheduled_date ? formatDay(p.scheduled_date) : "Date to be set"}
                      </span>
                      <span className="font-display text-body-s tracking-title text-[--text]">
                        {formatPrice(Number(p.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-body text-body-s leading-[1.7] text-[--text-muted]">
                  {/* Says "after", not "before": nothing in lib/email/send.ts or
                      the installment cron sends advance notice. The three
                      installment emails (received, failed, action required) all
                      go out after an attempt, so promising a heads-up here would
                      be a promise the system does not keep. */}
                  Each one is taken from the card you just used. You get an email each time one
                  goes through, and straight away if one does not.
                </p>
              </div>
            ) : (
              <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
                Your payment schedule appears here once the deposit clears. It splits the balance
                into two dated payments before departure.
              </p>
            )}

            {booking.group_code && (
              <div className="border-l-2 border-[--accent] pl-5">
                <p className="stamp-type text-[--text-muted]">Bring your friends</p>
                <p className="mt-3 font-body text-body-s leading-[1.7] text-[--text-secondary]">
                  Share{" "}
                  <span className="font-display tracking-label text-[--text]">
                    {booking.group_code}
                  </span>{" "}
                  with anyone booking this trip and you are placed together.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-[--rule] pt-8">
          <Button href="/bookings" variant="primary" size="md">
            Go to your bookings
          </Button>
          <Button href="/trips" variant="secondary" size="md">
            Browse trips
          </Button>
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="stamp-type text-[--text-muted]">{label}</dt>
      <dd className="mt-3 break-words font-display text-display-s tracking-title text-[--text]">
        {value}
      </dd>
    </div>
  );
}
