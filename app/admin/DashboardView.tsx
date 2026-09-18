import Link from "next/link";
import { cancelBookingAsAdmin, deletePendingBooking } from "./actions";
import { Alert, Button } from "@/components/ui";
import { formatPrice } from "@/lib/trips";
import { formatAmount, fromCents } from "@/lib/balance";
import { formatDay } from "@/app/(protected)/dates";
import {
  BookingStatusBadge,
  EmptyState,
  Figure,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  type BookingStatus,
  type PaymentStatus,
} from "@/app/admin/admin-ui";
import { isFlagged, readLedger, type Ledger, type LineTone } from "@/app/admin/payment-ledger";

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
  paid_at: string | null;
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
  // Everything below is derived from the rows already fetched, so the figure
  // row costs no extra round trip. The ledger is what tells a deposit from a
  // payment in full from an early payment (see payment-ledger.ts).
  const rows = bookings.map((booking) => ({ booking, ledger: readLedger(booking, today) }));

  // Only installments: a card declined at checkout was seen by the traveler
  // who typed it, and is not something to chase.
  const flaggedCount = rows.reduce(
    (count, { ledger }) => count + ledger.lines.filter(isFlagged).length,
    0,
  );

  const live = rows.filter(({ booking }) => booking.status !== "cancelled");
  const awaiting = rows.filter(({ booking }) => booking.status === "pending");
  const awaitingFull = awaiting.filter(({ ledger }) => ledger.plan === "full").length;
  const bookedValue = live.reduce((sum, { booking }) => sum + Number(booking.total_amount), 0);
  const collectedCents = live.reduce((sum, { ledger }) => sum + ledger.paidCents, 0);
  const toComeCents = live.reduce((sum, { ledger }) => sum + ledger.remainingCents, 0);
  const moneyBack = rows.filter(({ ledger }) => ledger.overpaidCents > 0 || ledger.refundedCents > 0);

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Overview"
        lede="Every booking on the system, newest first, with the state of its payment schedule."
        actions={
          <>
            <Button href="/admin/bookings" variant="secondary" size="sm">
              All bookings
            </Button>
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
          href="/admin/bookings?status=live"
          label="Live bookings"
          value={live.length}
          note={rows.length === live.length ? undefined : `${rows.length - live.length} cancelled`}
        />
        <Figure
          href="/admin/bookings?status=pending"
          label="Awaiting payment"
          value={awaiting.length}
          note={
            awaitingFull > 0
              ? `${awaitingFull} paying in full. Spot not held until paid`
              : "Spot not held until paid"
          }
        />
        <Figure
          href="/admin/bookings?owes=1"
          label="Booked value"
          value={formatPrice(bookedValue)}
          note={`${formatAmount(fromCents(collectedCents))} collected, ${formatAmount(fromCents(toComeCents))} to come. Excludes cancellations`}
        />
        <Figure
          href="/admin/payments"
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

      {moneyBack.length > 0 && (
        <div className="mt-4">
          <Alert tone="info" title="Overpayments and refunds">
            {moneyBack.length} booking{moneyBack.length === 1 ? " has" : "s have"} an overpayment or
            a refund on record. Check each one in Stripe.{" "}
            <Link href="/admin/payments" className="text-[--accent] decoration-[--accent]">
              See the list
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
                    <Th align="right">Paid</Th>
                    <Th>Payment schedule</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ booking, ledger }) => (
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
                        <BookingStatusBadge status={booking.status} plan={ledger.plan} />
                        <PlanNote ledger={ledger} />
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(Number(booking.total_amount))}
                        <span className="mt-1 block text-[--text-muted]">
                          {formatAmount(Number(booking.deposit_amount))} deposit
                        </span>
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        <Paid ledger={ledger} status={booking.status} />
                      </Td>
                      <Td className="min-w-[20rem]">
                        <Schedule ledger={ledger} />
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
 * Which plan the booking is on, under its status badge. "Paid in full" on its
 * own does not say whether that happened at checkout or by paying ahead, and
 * the two read differently on cancellation.
 */
function PlanNote({ ledger }: { ledger: Ledger }) {
  const text =
    ledger.plan === "full"
      ? "Paid in full at booking"
      : ledger.paidAheadCount > 0
        ? `Deposit plan, paid ahead ${ledger.paidAheadCount === 1 ? "once" : `${ledger.paidAheadCount} times`}`
        : "Deposit plan";
  return <span className="mt-1.5 block text-body-s text-[--text-muted]">{text}</span>;
}

/**
 * What has cleared and what is still to come, from the payments that
 * succeeded rather than from the schedule: a cancelled installment or an
 * abandoned card form is not money. An overpayment is the one figure here in
 * the flag color, because someone has to check the refund went out.
 */
function Paid({ ledger, status }: { ledger: Ledger; status: BookingStatus }) {
  return (
    <>
      {formatAmount(fromCents(ledger.paidCents))}
      {ledger.overpaidCents > 0 ? (
        <span className="mt-1 block text-[--flag-ink]">
          Overpaid by {formatAmount(fromCents(ledger.overpaidCents))}
        </span>
      ) : status === "cancelled" ? (
        <span className="mt-1 block text-[--text-muted]">Nothing further due</span>
      ) : (
        <span className="mt-1 block text-[--text-muted]">
          {ledger.remainingCents > 0
            ? `${formatAmount(fromCents(ledger.remainingCents))} to go`
            : "Nothing owed"}
        </span>
      )}
      {ledger.refundedCents > 0 && (
        <span className="mt-1 block text-[--accent]">
          {formatAmount(fromCents(ledger.refundedCents))} refunded
        </span>
      )}
    </>
  );
}

const LINE_TONE: Record<LineTone, { rule: string; text: string; label: string }> = {
  normal: { rule: "border-l-[--rule-faint]", text: "text-[--text-secondary]", label: "text-[--text-muted]" },
  flag: { rule: "border-l-[--flag]", text: "text-[--flag-ink]", label: "text-[--flag-ink]" },
  muted: { rule: "border-l-[--rule-faint]", text: "text-[--text-muted]", label: "text-[--text-muted]" },
  notice: { rule: "border-l-[--accent]", text: "text-[--text-secondary]", label: "text-[--accent]" },
};

/**
 * Every payment on one booking, one line each: the checkout payment, each
 * installment and each early payment, in order.
 *
 * A flagged line is the only place the flag color appears in the table body:
 * the rule down its left edge and the label both switch to it, so a schedule
 * that needs chasing is findable by scanning the column rather than by reading
 * it. Early payment attempts the traveler abandoned were never charged, so
 * they are collapsed into one muted line instead of each reading as a bare
 * "Canceled, no date".
 */
function Schedule({ ledger }: { ledger: Ledger }) {
  if (ledger.lines.length === 0 && ledger.abandoned === 0) {
    return <span className="text-[--text-muted]">No payments recorded</span>;
  }

  return (
    <ul className="flex list-none flex-col gap-1.5 p-0">
      {ledger.lines.map((line) => {
        const tone = LINE_TONE[line.tone];
        return (
          <li key={line.payment.id} className={`border-l-2 pl-2.5 ${tone.rule} ${tone.text}`}>
            <span className={line.tone === "muted" ? "tabular-nums" : "tabular-nums text-[--text]"}>
              {formatAmount(Number(line.payment.amount))}
            </span>{" "}
            {line.what}
            {line.date && <span className="tabular-nums">, {formatDay(line.date)}</span>}{" "}
            <span className={tone.label}>{line.label}</span>
          </li>
        );
      })}
      {ledger.abandoned > 0 && (
        <li className="border-l-2 border-l-[--rule-faint] pl-2.5 text-[--text-muted]">
          {ledger.abandoned === 1
            ? "1 early payment started and abandoned, never charged"
            : `${ledger.abandoned} early payments started and abandoned, never charged`}
        </li>
      )}
    </ul>
  );
}
