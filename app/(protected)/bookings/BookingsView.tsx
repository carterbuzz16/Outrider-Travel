import Link from "next/link";
import { Alert, Badge, Button, type BadgeTone } from "@/components/ui";
import { cancelBooking } from "@/app/(protected)/bookings/actions";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";
import type { Database } from "@/types/supabase";

/**
 * The account view, with no data access in it.
 *
 * Split from page.tsx so the whole screen can be rendered from fixtures — an
 * empty account, a deposit still owed, a 3DS challenge, a cancelled booking —
 * without standing up a session for each one. The page stays a thin loader that
 * reads the session's own rows and hands them straight over.
 *
 * Still a Server Component: the only interactive parts are links and a form
 * posting a server action, so nothing here hydrates.
 */

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type BookingRow = {
  id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  trips: { name: string; destination: string; start_date: string; end_date: string } | null;
  tiers: { name: string } | null;
  payments: {
    id: string;
    status: PaymentStatus;
    amount: number;
    scheduled_date: string | null;
  }[];
};

/**
 * Booking status as the traveler experiences it, not as the column spells it.
 * "pending" is the one that earns burnt orange: it is the only state where
 * money is owed right now and the spot is not yet held. Everything else is
 * information, so it stays in the accent or in the muted rule.
 */
const STATUS: Record<BookingStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: "urgent", label: "Deposit due" },
  deposit_paid: { tone: "open", label: "Deposit paid" },
  paid_in_full: { tone: "new", label: "Paid in full" },
  cancelled: { tone: "closed", label: "Cancelled" },
};

/** Statuses a traveler can still stand down themselves — see cancelBooking. */
const CANCELLABLE: BookingStatus[] = ["pending", "deposit_paid"];

export default function BookingsView({
  email,
  name,
  bookings,
  error,
}: {
  email: string;
  name: string | null;
  bookings: BookingRow[];
  error?: string;
}) {
  return (
    <main>
      <header className="shell pt-14 md:pt-20">
        <p className="stamp-type text-[--text-muted]">Your account</p>
        <h1 className="t-title mt-5 text-[--text]">Bookings</h1>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-[--rule] pt-7">
          <div className="min-w-0">
            <p className="stamp-type text-[--text-muted]">Traveler</p>
            {name && (
              <p className="mt-3 font-display text-display-s tracking-title text-[--text]">{name}</p>
            )}
            <p className="mt-2 break-words font-body text-body-s text-[--text-secondary]">{email}</p>
          </div>

          <Button href="/trips" variant="secondary" size="sm">
            Browse trips
          </Button>
        </div>
      </header>

      <div className="shell pb-20 pt-10 md:pb-28">
        {error && (
          <div className="mb-8">
            <Alert tone="warning" title="That did not go through">
              {error}
            </Alert>
          </div>
        )}

        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex list-none flex-col gap-6 p-0">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

/* -- the card -------------------------------------------------------------- */

function BookingCard({ booking }: { booking: BookingRow }) {
  const status = STATUS[booking.status];
  const trip = booking.trips;

  const total = Number(booking.total_amount);
  // Only a `succeeded` row is money in the bank. `pending` is the deposit
  // PaymentIntent sitting unconfirmed and `scheduled` is a future installment,
  // so neither counts toward what has been paid.
  const paid = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const paidShare = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  // An off-session installment that hit 3DS. It outranks everything else on the
  // card: nothing else moves until the bank is satisfied.
  const needsAuth = booking.payments.find((p) => p.status === "requires_action");
  const failed = !needsAuth && booking.payments.find((p) => p.status === "failed");

  const nextInstallment = booking.payments
    .filter((p) => p.status === "scheduled" && p.scheduled_date)
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))[0];

  const cancellable = CANCELLABLE.includes(booking.status);
  const cancelled = booking.status === "cancelled";

  return (
    <article className="border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="stamp-type text-[--text-muted]">{trip?.destination ?? "Trip"}</p>
          <h2 className="t-subheading mt-3 text-[--text]">{trip?.name ?? "Booking"}</h2>
          <p className="mt-3 font-body text-body-s text-[--text-secondary]">
            {trip ? formatDateRange(trip.start_date, trip.end_date) : "Dates to be confirmed"}
            {booking.tiers?.name ? ` · ${booking.tiers.name}` : ""}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {!cancelled && (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[--rule-faint] pt-7 lg:grid-cols-4">
            <Stat label="Paid" value={formatPrice(paid)} note={`of ${formatPrice(total)}`} />
            <Stat label="Remaining" value={formatPrice(remaining)} />
            <Stat
              label="Next payment"
              value={
                booking.status === "pending"
                  ? formatPrice(Number(booking.deposit_amount))
                  : nextInstallment
                    ? formatPrice(Number(nextInstallment.amount))
                    : "None"
              }
              note={
                booking.status === "pending"
                  ? "deposit, due now"
                  : nextInstallment?.scheduled_date
                    ? formatDay(nextInstallment.scheduled_date)
                    : "balance settled"
              }
            />
            <Stat label="Group code" value={booking.group_code ?? "None"} />
          </dl>

          {/* A hairline meter, not a progress bar: same 1px vocabulary as every
              other rule on the page. The numbers above already say the amount,
              so this is decoration and stays out of the accessibility tree. */}
          <div aria-hidden="true" className="mt-7 h-[3px] w-full bg-[--rule-faint]">
            <div className="h-full bg-[--accent]" style={{ width: `${paidShare}%` }} />
          </div>
        </>
      )}

      {needsAuth && (
        <div className="mt-7">
          <Alert tone="warning" title="Your bank needs to verify a payment">
            {formatPrice(Number(needsAuth.amount))} could not be taken without you confirming it.{" "}
            <Link
              href={`/bookings/${booking.id}/installments/${needsAuth.id}`}
              className="text-[--accent] decoration-[--accent]"
            >
              Verify it now
            </Link>
            .
          </Alert>
        </div>
      )}

      {failed && (
        <div className="mt-7">
          <Alert tone="error" title="A payment did not go through">
            We could not take {formatPrice(Number(failed.amount))}. Get in touch and we will sort out
            a new card.
          </Alert>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[--rule-faint] pt-6">
        {booking.status === "pending" && (
          <Button href={`/bookings/${booking.id}/pay`} variant="primary" size="sm">
            Pay deposit
          </Button>
        )}
        {booking.status !== "pending" && !cancelled && (
          <Button href={`/bookings/${booking.id}/confirmation`} variant="secondary" size="sm">
            Booking details
          </Button>
        )}
        {cancellable && (
          <form action={cancelBooking} className="flex items-center">
            <input type="hidden" name="booking_id" value={booking.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-[--text-secondary]">
              Cancel booking
            </Button>
          </form>
        )}
        {cancelled && (
          <p className="font-body text-body-s text-[--text-secondary]">
            This booking was cancelled. Anything already charged is handled by hand, so write to us
            if you have a question about it.
          </p>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="stamp-type text-[--text-muted]">{label}</dt>
      <dd className="mt-3 font-display text-display-s tracking-title text-[--text]">
        <span className="break-words">{value}</span>
        {/* Its own line rather than trailing the figure: in the two-column
            mobile grid an inline note wraps mid-phrase and the column reads
            ragged. */}
        {note && <span className="t-micro mt-2 block text-[--text-secondary]">{note}</span>}
      </dd>
    </div>
  );
}

/* -- nothing booked -------------------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-6 border border-[--rule] bg-[--surface-raised] px-6 py-14 md:items-center md:px-8 md:py-20 md:text-center">
      <p className="stamp-type text-[--text-muted]">Nothing booked yet</p>
      <h2 className="t-subheading max-w-[20ch] text-[--text]">No trips on your account</h2>
      <p className="max-w-measure-tight font-body text-body leading-[1.7] text-[--text-secondary]">
        We open a few departures at a time. Pick one and a deposit
        holds the room while the balance is split into scheduled payments.
      </p>
      <Button href="/trips" variant="primary" size="md">
        See what is open
      </Button>
    </div>
  );
}
