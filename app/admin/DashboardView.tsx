import Link from "next/link";
import { cancelBookingAsAdmin, deletePendingBooking } from "./actions";
import { Alert, Button } from "@/components/ui";
import { formatPrice } from "@/lib/trips";
import { formatDay } from "@/app/(protected)/dates";
import {
  BookingStatusBadge,
  EmptyState,
  Figure,
  PAYMENT_STATUS_LABEL,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  type BookingStatus,
  type PaymentStatus,
} from "@/app/admin/admin-ui";

/**
 * The dashboard, with no data access in it. Same split as TripsView and
 * TripEditor: the page reads the rows, this draws them, and every state
 * (nothing booked, a schedule full of failures) can be rendered from fixtures.
 */

export type DashboardPayment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  scheduled_date: string | null;
  attempt_count: number;
};

export type DashboardBooking = {
  id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  created_at: string;
  users: { email: string } | null;
  trips: { name: string } | null;
  tiers: { name: string } | null;
  payments: DashboardPayment[];
};

export default function DashboardView({
  bookings,
  today,
}: {
  bookings: DashboardBooking[];
  today: string;
}) {
  const flaggedCount = (bookings ?? []).reduce((count, booking) => {
    const flagged = (booking.payments ?? []).filter(
      (payment) =>
        payment.status === "failed" ||
        payment.status === "requires_action" ||
        (payment.status === "scheduled" && payment.scheduled_date && payment.scheduled_date < today)
    );
    return count + flagged.length;
  }, 0);

  // Everything below is derived from the rows already fetched above, so the
  // figure row costs no extra round trip.
  const rows = bookings;
  const live = rows.filter((booking) => booking.status !== "cancelled");
  const awaitingDeposit = rows.filter((booking) => booking.status === "pending");
  const bookedValue = live.reduce((sum, booking) => sum + Number(booking.total_amount), 0);

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Overview"
        lede="Every booking on the system, newest first, with the state of its payment schedule."
        actions={
          <>
            <Button href="/admin/trips" variant="secondary" size="sm">
              Manage trips
            </Button>
            <Button href="/admin/trips/new" variant="primary" size="sm">
              New trip
            </Button>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Figure
          label="Live bookings"
          value={live.length}
          note={rows.length === live.length ? undefined : `${rows.length - live.length} cancelled`}
        />
        <Figure
          label="Awaiting deposit"
          value={awaitingDeposit.length}
          note="Spot not held until paid"
        />
        <Figure label="Booked value" value={formatPrice(bookedValue)} note="Excludes cancellations" />
        <Figure
          label="Flagged installments"
          value={flaggedCount}
          tone={flaggedCount > 0 ? "flag" : "default"}
          note={flaggedCount > 0 ? "Overdue, failed or unauthenticated" : "Nothing needs chasing"}
        />
      </div>

      {flaggedCount > 0 && (
        <div className="mt-8">
          <Alert tone="warning" title="Payments need attention">
            {flaggedCount} installment{flaggedCount === 1 ? "" : "s"}{" "}
            {flaggedCount === 1 ? "is" : "are"} overdue, failed, or waiting on the customer to
            authenticate.{" "}
            <Link href="/admin/payments" className="text-[--accent] decoration-[--accent]">
              Open the flagged list
            </Link>
            .
          </Alert>
        </div>
      )}

      <div className="mt-10">
        <Panel
          title="Bookings"
          description={`${rows.length} booking${rows.length === 1 ? "" : "s"} in total.`}
          bleed
        >
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No bookings yet"
                action={
                  <Button href="/admin/trips" variant="secondary" size="sm">
                    Check trip status
                  </Button>
                }
              >
                Bookings land here the moment someone reserves a spot. If a trip should be taking
                them, confirm it is published and has at least one tier.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="All bookings">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Trip</Th>
                    <Th>Tier</Th>
                    <Th>Group</Th>
                    <Th>Status</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Deposit</Th>
                    <Th>Payment schedule</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((booking) => (
                    <tr key={booking.id}>
                      {/* Cells stay on one line and the container scrolls:
                          a wrapped email reads worse than a wider table. */}
                      <Td className="whitespace-nowrap">{booking.users?.email ?? <Missing />}</Td>
                      <Td className="whitespace-nowrap">{booking.trips?.name ?? <Missing />}</Td>
                      <Td className="whitespace-nowrap text-[--text-secondary]">
                        {booking.tiers?.name ?? <Missing />}
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-body-s">
                        {booking.group_code ?? <Missing />}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <BookingStatusBadge status={booking.status} />
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatPrice(Number(booking.total_amount))}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {formatPrice(Number(booking.deposit_amount))}
                      </Td>
                      <Td className="min-w-[18rem]">
                        <Schedule payments={booking.payments ?? []} today={today} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        <BookingActions
                          bookingId={booking.id}
                          status={booking.status}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </main>
  );
}

/**
 * Removing someone from a departure.
 *
 * A booking that never took money can be deleted outright. Anything that has a
 * confirmed deposit is cancelled instead, so the financial record survives and
 * the Stripe charge still has a row explaining it. Either way the spot stops
 * counting against capacity.
 */
function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  if (status === "cancelled") {
    return <span className="t-micro text-[--text-muted]">Cancelled</span>;
  }

  const unpaid = status === "pending";

  return (
    <form action={unpaid ? deletePendingBooking : cancelBookingAsAdmin}>
      <input type="hidden" name="booking_id" value={bookingId} />
      <button
        type="submit"
        className="t-micro border border-[--rule-strong] px-3 py-2 text-[--text] transition-colors duration-fast hover:border-[--flag-ink] hover:text-[--flag-ink]"
      >
        {unpaid ? "Remove" : "Cancel"}
      </button>
    </form>
  );
}

/** An absent value, said in words rather than left as a dash to squint at. */
function Missing() {
  return <span className="text-[--text-muted]">None</span>;
}

/**
 * The installment plan for one booking, one line per payment.
 *
 * A flagged line is the only place color appears in the table body: the rule
 * down its left edge and the label both switch to the flag, so a schedule that
 * needs chasing is findable by scanning the column rather than by reading it.
 */
function Schedule({ payments, today }: { payments: DashboardPayment[]; today: string }) {
  if (payments.length === 0) {
    return <span className="text-[--text-muted]">No payments scheduled</span>;
  }

  const ordered = [...payments].sort((a, b) =>
    (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
  );

  return (
    <ul className="flex list-none flex-col gap-1.5 p-0">
      {ordered.map((payment) => {
        const overdue =
          payment.status === "scheduled" &&
          !!payment.scheduled_date &&
          payment.scheduled_date < today;
        const flagged =
          overdue || payment.status === "failed" || payment.status === "requires_action";

        return (
          <li
            key={payment.id}
            className={
              flagged
                ? "border-l-2 border-l-[--flag] pl-2.5 text-[--flag-ink]"
                : "border-l-2 border-l-[--rule-faint] pl-2.5 text-[--text-secondary]"
            }
          >
            <span className="tabular-nums text-[--text]">
              {formatPrice(Number(payment.amount))}
            </span>{" "}
            <span className="tabular-nums">
              {payment.scheduled_date ? formatDay(payment.scheduled_date) : "no date"}
            </span>{" "}
            <span className={flagged ? "text-[--flag-ink]" : "text-[--text-muted]"}>
              {overdue ? "Overdue" : PAYMENT_STATUS_LABEL[payment.status]}
              {payment.attempt_count > 0 &&
                ` after ${payment.attempt_count} attempt${payment.attempt_count === 1 ? "" : "s"}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
