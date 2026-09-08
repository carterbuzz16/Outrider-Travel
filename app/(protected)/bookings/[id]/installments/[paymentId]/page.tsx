import { notFound, redirect } from "next/navigation";
import { Alert, Button, SectionDivider } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { formatDateRange, formatPrice } from "@/lib/trips";
import CompleteAuthenticationForm from "@/components/CompleteAuthenticationForm";

/**
 * The 3DS re-authentication screen for a scheduled installment.
 *
 * A traveller lands here from an email or from the alert on their bookings
 * page, usually with no idea why a trip they already booked is asking about
 * money again. So the page leads with what this is not — not a new charge, not
 * a decline, not a price change — before it offers the button, and says what
 * happens on both sides of the bank's answer.
 */
export default async function InstallmentAuthenticationPage(
  props: {
    params: Promise<{ id: string; paymentId: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view payments for own bookings") already scopes this to
  // the signed-in user's own bookings, so a mismatched id just comes back empty.
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, status, amount, stripe_payment_intent_id, booking_id, bookings(trips(name, destination, start_date, end_date), tiers(name))"
    )
    .eq("id", params.paymentId)
    .eq("booking_id", params.id)
    .single();

  if (!payment) {
    notFound();
  }

  if (payment.status !== "requires_action" || !payment.stripe_payment_intent_id) {
    redirect("/bookings");
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);

  const trip = payment.bookings?.trips;
  const amount = formatPrice(Number(payment.amount));

  return (
    <main>
      <section className="shell max-w-[52rem] py-14 md:py-20">
        <p className="stamp-type text-[--text-muted]">Bank verification</p>
        <h1 className="t-title mt-5 max-w-[18ch] text-[--text]">Verify this payment</h1>
        <p className="mt-6 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          This is a scheduled installment on a booking you already have. It is not a new charge, the
          amount has not changed, and nothing has been taken from your card. Your bank wants to hear
          from you directly before it lets this one through.
        </p>

        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[--rule] pt-8 lg:grid-cols-4">
          <Fact label="Amount" value={amount} numeric />
          <Fact label="Trip" value={trip?.name ?? "Your booking"} />
          <Fact
            label="Dates"
            value={trip ? formatDateRange(trip.start_date, trip.end_date) : "On your booking"}
            numeric={Boolean(trip)}
          />
          <Fact label="Package" value={payment.bookings?.tiers?.name ?? "Standard"} />
        </dl>

        <div className="mt-10">
          <Alert tone="info" title="Why this is being asked">
            Some banks, and most cards issued outside the United States, want the cardholder present
            for a payment. An automatic charge cannot satisfy that, because nobody is at the
            keyboard when it runs. It is a security step, not a decline.
          </Alert>
        </div>

        <SectionDivider variant="rule" className="mt-12" />

        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <h2 className="t-heading text-[--text]">What happens next</h2>

          <ol className="flex list-none flex-col gap-7 p-0">
            <Step n="01" title="Your bank runs its check">
              A window from your bank opens over this page. It may ask for a code, a fingerprint, or
              a tap in your banking app.
            </Step>
            <Step n="02" title={`${amount} is taken`}>
              Once the bank is satisfied, this installment is charged to the card already on your
              booking and marked paid. There is nothing to re-enter.
            </Step>
            <Step n="03" title="You land back on your bookings">
              The payment schedule updates, and a receipt reaches your inbox. If the check does not
              pass, nothing is charged and the installment stays open for you to try again.
            </Step>
          </ol>
        </div>

        <div className="mt-12 border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
          <p className="t-micro text-[--text-secondary]">Verification</p>
          <p className="mt-3 max-w-measure font-body text-body leading-[1.7] text-[--text]">
            Ready when you are. Keep your phone nearby.
          </p>

          <div className="mt-6">
            <CompleteAuthenticationForm clientSecret={paymentIntent.client_secret!} />
          </div>
        </div>

        <div className="mt-10 border-t border-[--rule] pt-8">
          <Button href="/bookings" variant="ghost" size="sm" className="text-[--text-secondary]">
            Back to your bookings
          </Button>
        </div>
      </section>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="border-l border-[--rule] pl-5">
      <p className="stamp-type tabular-nums text-[--accent]">{n}</p>
      <p className="mt-3 font-display text-body tracking-title text-[--text]">{title}</p>
      <p className="mt-2 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
        {children}
      </p>
    </li>
  );
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
