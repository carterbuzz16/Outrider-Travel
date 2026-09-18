import Link from "next/link";
import { Alert, Badge, Button, Facts, ScheduleTable, type BadgeTone } from "@/components/ui";
import CancelBookingButton from "@/app/(protected)/bookings/CancelBookingButton";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange } from "@/lib/trips";
import { formatAmount } from "@/lib/balance";
import BalancePayment from "./BalancePayment";
import { createPortalUrl } from "@/lib/portal-token";
import { confirmationNumber } from "@/lib/confirmation-number";
import type { Database } from "@/types/supabase";
import PenthouseProgress from "@/components/PenthouseProgress";
import { penthouseInvitePath, type PenthouseSnapshot } from "@/lib/penthouse";

/**
 * The account view, with no data access in it.
 *
 * Split from page.tsx so the whole screen can be rendered from fixtures — an
 * empty account, a deposit still owed, a 3DS challenge, a cancelled booking —
 * without standing up a session for each one. The page stays a thin loader that
 * reads the session's own rows and hands them straight over.
 *
 * Still a Server Component: the only interactive parts are links and a form
 * posting a server action. There are two client islands: CancelBookingButton,
 * which puts a confirmation in front of that form, and BalancePayment, for
 * paying the balance down early.
 */

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type BookingRow = {
  id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  /** Optional so fixtures without them still render; the penthouse block needs both. */
  trip_id?: string;
  tier_id?: string;
  /**
   * Set by the loader for a penthouse booking: the group's fill progress (counts
   * only, see getPenthouseProgress) and the server clock it was read at.
   */
  penthouse?: { snapshot: PenthouseSnapshot; renderedAt: string } | null;
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

/** A schedule row's state, in the traveler's words rather than the enum's. */
const PAYMENT_LABEL: Partial<Record<PaymentStatus, string>> = {
  succeeded: "Paid",
  scheduled: "Scheduled",
  pending: "Processing",
  failed: "Did not go through",
  requires_action: "Needs verifying",
  refunded: "Refunded",
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
              <p className="mt-3 font-display font-medium text-display-s tracking-title text-[--text]">{name}</p>
            )}
            <p className="mt-2 break-words font-body text-body-s text-[--text-secondary]">{email}</p>
          </div>

          <Button href="/trips" variant="secondary" size="md">
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
          <ul className="m-0 flex max-w-[56rem] list-none flex-col gap-8 p-0">
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
  const trip = booking.trips;

  const total = Number(booking.total_amount);

  // What a pending booking is waiting on: the deposit, or the whole price when
  // the traveler chose to pay in full at booking. Read from its checkout row
  // (the only unscheduled one a pending booking has), since deposit_amount is
  // recorded either way.
  const checkoutRow =
    booking.status === "pending"
      ? booking.payments.find((p) => !p.scheduled_date && (p.status === "pending" || p.status === "failed"))
      : undefined;
  const dueNow = checkoutRow ? Number(checkoutRow.amount) : Number(booking.deposit_amount);
  const fullPlanDue = booking.status === "pending" && dueNow >= total;
  const status = fullPlanDue ? { ...STATUS.pending, label: "Payment due" } : STATUS[booking.status];
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
  // The same signed page the emails link to; null if the portal is switched off.
  const portalUrl = !cancelled && booking.status !== "pending" ? createPortalUrl(booking.id) : null;

  const schedule = booking.payments
    .filter((p) => p.scheduled_date && p.status !== "canceled")
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  return (
    <article className="border border-[--rule] bg-[--surface-raised]" aria-labelledby={`booking-${booking.id}`}>
      {/* -- what and when ---------------------------------------------------- */}
      <header className="p-5 sm:p-7">
        {/* Status shares the top line with the destination, so it is read
            with the trip rather than found after it on a phone. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="t-micro text-[--text-secondary]">{trip?.destination ?? "Trip"}</p>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h2 id={`booking-${booking.id}`} className="t-subheading mt-3 text-[--text]">
          {trip?.name ?? "Booking"}
        </h2>
        <p className="mt-2 font-body text-body-s text-[--text]">
          {trip ? formatDateRange(trip.start_date, trip.end_date) : "Dates to be confirmed"}
          {booking.tiers?.name && <span className="text-[--text-secondary]"> · {booking.tiers.name}</span>}
        </p>
        {/* The confirmation number is the same reference the email and the
            confirmation page quote, and is not shown until something is
            paid, when there is a booking to confirm. */}
        {(booking.status !== "pending" || booking.group_code) && (
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-body text-body-s text-[--text-secondary]">
            {booking.status !== "pending" && (
              <span>
                Confirmation <span className="tabular-nums text-[--text]">{confirmationNumber(booking.id)}</span>
              </span>
            )}
            {booking.group_code && (
              <span>
                Group code <span className="tracking-label text-[--text]">{booking.group_code}</span>
                {!booking.penthouse && " · friends who enter it when they book are placed with you"}
              </span>
            )}
          </p>
        )}
      </header>

      {/* -- a penthouse's fill progress and invite -------------------------- */}
      {!cancelled && booking.penthouse && booking.group_code && booking.trip_id && booking.tier_id && (
        <div className="border-t border-[--rule] p-5 sm:p-7">
          <PenthouseProgress
            initial={booking.penthouse.snapshot}
            renderedAt={booking.penthouse.renderedAt}
            tierId={booking.tier_id}
            groupCode={booking.group_code}
            invitePath={penthouseInvitePath(booking.trip_id, booking.tier_id, booking.group_code)}
          />
        </div>
      )}

      <div className="border-t border-[--rule] p-5 sm:p-7">
        {/* -- money -------------------------------------------------------- */}
        {!cancelled && (
          <>
            <Facts
              size="l"
              columns={3}
              items={[
                { label: "Paid", value: formatAmount(paid), note: `of ${formatAmount(total)}` },
                { label: "Remaining", value: formatAmount(remaining) },
                {
                  label: booking.status === "pending" ? "Due now" : "Next payment",
                  value:
                    booking.status === "pending"
                      ? formatAmount(dueNow)
                      : nextInstallment
                        ? formatAmount(Number(nextInstallment.amount))
                        : "None",
                  note:
                    booking.status === "pending"
                      ? fullPlanDue
                        ? "The full price"
                        : "The deposit"
                      : nextInstallment?.scheduled_date
                        ? formatDay(nextInstallment.scheduled_date)
                        : "Balance settled",
                },
              ]}
            />

            {/* A hairline meter, not a progress bar: same 1px vocabulary as every
                other rule on the page. The numbers above already say the amount,
                so this is decoration and stays out of the accessibility tree. */}
            <div aria-hidden="true" className="mt-6 h-[3px] w-full bg-[--rule-faint]">
              <div className="h-full bg-[--accent]" style={{ width: `${paidShare}%` }} />
            </div>
          </>
        )}

        {needsAuth && (
          <div className="mt-7">
            <Alert tone="warning" title="Your bank needs to verify a payment">
              {formatAmount(Number(needsAuth.amount))} could not be taken without you confirming it.{" "}
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
              We could not take {formatAmount(Number(failed.amount))}. Get in touch and we will sort
              out a new card.
            </Alert>
          </div>
        )}

        {/* -- schedule ----------------------------------------------------- */}
        {!cancelled && schedule.length > 0 && (
          <ScheduleTable
            className="mt-8"
            caption="Payment schedule"
            rows={schedule.map((p) => ({
              key: p.id,
              date: p.scheduled_date ? formatDay(p.scheduled_date) : "Date to be set",
              status: PAYMENT_LABEL[p.status] ?? p.status,
              amount: formatAmount(Number(p.amount)),
            }))}
          />
        )}

        {/* Only once the deposit has cleared: before that there is no schedule
            to pay ahead of, and after paid_in_full nothing is owed. */}
        {booking.status === "deposit_paid" && remaining > 0 && (
          <BalancePayment bookingId={booking.id} remaining={remaining} />
        )}

        {cancelled && (
          <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
            This booking was cancelled. Anything already charged is handled by hand, so write to us
            if you have a question about it.
          </p>
        )}
      </div>

      {/* -- actions ---------------------------------------------------------
          The way forward first; cancelling pushed to the far end as a quiet
          text button, so it is findable but never where a thumb lands first. */}
      {!cancelled && (
        <footer className="flex flex-col gap-3 border-t border-[--rule] p-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-7 sm:py-5">
          {booking.status === "pending" && (
            <Button href={`/bookings/${booking.id}/pay`} variant="primary" size="md">
              {fullPlanDue ? `Pay ${formatAmount(dueNow)} now` : `Pay ${formatAmount(dueNow)} deposit`}
            </Button>
          )}
          {portalUrl && (
            <Button href={portalUrl} variant="primary" size="md">
              Trip details &amp; forms
            </Button>
          )}
          {booking.status !== "pending" && (
            <Button href={`/bookings/${booking.id}/confirmation`} variant="secondary" size="md">
              Booking details
            </Button>
          )}
          {cancellable && (
            <div className="mt-1 flex justify-center border-t border-[--rule-faint] pt-3 sm:ml-auto sm:mt-0 sm:border-0 sm:pt-0">
              <CancelBookingButton
                bookingId={booking.id}
                tripName={trip?.name ?? "this trip"}
                paidLabel={paid > 0 ? formatAmount(paid) : null}
                depositLabel={formatAmount(Number(booking.deposit_amount))}
              />
            </div>
          )}
        </footer>
      )}
    </article>
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
