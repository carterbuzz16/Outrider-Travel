import { Badge, Button } from "@/components/ui";
import { formatAmount, fromCents } from "@/lib/balance";
import { formatDay } from "@/app/(protected)/dates";
import {
  BookingStatusBadge,
  EmptyState,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
} from "@/app/admin/admin-ui";
import type { DashboardBooking } from "@/app/admin/DashboardView";
import { isFlagged, readLedger, type Ledger, type LedgerLine } from "@/app/admin/payment-ledger";

/**
 * The payments screen, with no data access in it. Same split as the other
 * admin screens.
 *
 * Four lists, most urgent first: installments that need a person, bookings
 * where money has gone or must go back, early payments, and bookings paid in
 * full at checkout. Each is read off the booking's whole ledger (see
 * payment-ledger.ts) rather than off single rows, because a row on its own
 * cannot say which kind of payment it is.
 */

type Row = { booking: DashboardBooking; ledger: Ledger };

export default function FlaggedPaymentsView({
  bookings,
  today,
}: {
  bookings: DashboardBooking[];
  today: string;
}) {
  const rows: Row[] = bookings.map((booking) => ({ booking, ledger: readLedger(booking, today) }));

  const flagged = rows
    .flatMap((row) => row.ledger.lines.filter(isFlagged).map((line) => ({ ...row, line })))
    .sort((a, b) => (a.line.date ?? "").localeCompare(b.line.date ?? ""));
  const flaggedOwed = flagged.reduce((sum, { line }) => sum + Number(line.payment.amount), 0);

  const moneyBack = rows.filter(({ ledger }) => ledger.overpaidCents > 0 || ledger.refundedCents > 0);

  const early = rows
    .flatMap((row) =>
      row.ledger.lines.filter((line) => line.kind === "balance").map((line) => ({ ...row, line })),
    )
    // Newest first; one still in progress (no paid date) at the top.
    .sort((a, b) => (b.line.date ?? "9999-12-31").localeCompare(a.line.date ?? "9999-12-31"));
  const abandoned = rows.reduce((sum, { ledger }) => sum + ledger.abandoned, 0);

  const paidAtBooking = rows.filter(({ ledger, booking }) => ledger.plan === "full" && booking.status !== "pending");

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Payments"
        lede="Installments that failed or are waiting on the customer's bank, money that has to go back, early payments, and bookings paid in full at checkout."
        back={{ href: "/admin", label: "Overview" }}
        actions={
          <Button href="/admin" variant="secondary" size="sm">
            All bookings
          </Button>
        }
      />

      <div className="mt-10 flex flex-col gap-10">
        <Panel
          title="Needs a person"
          description={
            flagged.length === 0
              ? "Nothing is stuck right now."
              : `${flagged.length} installment${flagged.length === 1 ? "" : "s"}, ${formatAmount(flaggedOwed)} outstanding.`
          }
          bleed
        >
          {flagged.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing flagged">
                Every installment is either scheduled, taken, covered by an early payment, or
                refunded. Failed charges, overdue installments and bank authentication requests show
                up here as soon as they happen.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="Flagged installments">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Trip</Th>
                    <Th align="right">Amount</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th align="right">Attempts</Th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map(({ booking, line }) => (
                    <tr key={line.payment.id}>
                      <Td className="whitespace-nowrap">{booking.users?.email ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap">{booking.trips?.name ?? <Unknown />}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(Number(line.payment.amount))}
                      </Td>
                      <Td className="whitespace-nowrap text-[--text-secondary]">
                        <Day line={line} empty="No date" />
                      </Td>
                      <Td className="whitespace-nowrap">
                        {/* Every status on this list is the reason it exists,
                            so all of them carry the flag. */}
                        <Badge tone="urgent">{line.label}</Badge>
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {line.payment.attempt_count}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        <Panel
          title="Overpayments and refunds"
          description={
            moneyBack.length === 0
              ? "No booking has taken more than its total, and no refund is on record."
              : "Two charges crossing can take more than a booking's total. The excess is refunded automatically to the original card; check each one went through in Stripe."
          }
          bleed
        >
          {moneyBack.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing to refund">
                A booking shows up here if what has cleared adds up to more than its total, or if
                any of its payments is marked refunded.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="Overpayments and refunds">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Trip</Th>
                    <Th>Status</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Overpaid</Th>
                    <Th align="right">Refunded</Th>
                  </tr>
                </thead>
                <tbody>
                  {moneyBack.map(({ booking, ledger }) => (
                    <tr key={booking.id}>
                      <Td className="whitespace-nowrap">{booking.users?.email ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap">{booking.trips?.name ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap">
                        <BookingStatusBadge status={booking.status} plan={ledger.plan} />
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(Number(booking.total_amount))}
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(fromCents(ledger.paidCents))}
                      </Td>
                      <Td
                        align="right"
                        className={
                          ledger.overpaidCents > 0
                            ? "whitespace-nowrap text-[--flag-ink]"
                            : "whitespace-nowrap text-[--text-muted]"
                        }
                      >
                        {ledger.overpaidCents > 0 ? formatAmount(fromCents(ledger.overpaidCents)) : "None"}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {ledger.refundedCents > 0 ? formatAmount(fromCents(ledger.refundedCents)) : "None"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        <Panel
          title="Early payments"
          description={
            <>
              Payments toward the balance made from the bookings page. Each one comes off the
              earliest installment first.
              {abandoned > 0 &&
                ` ${abandoned} attempt${abandoned === 1 ? " was" : "s were"} started and abandoned without a charge, and ${abandoned === 1 ? "is" : "are"} not listed.`}
            </>
          }
          bleed
        >
          {early.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No early payments yet">
                When a traveler on the deposit plan pays toward their balance ahead of schedule, the
                payment shows up here.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="Early payments">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Trip</Th>
                    <Th align="right">Amount</Th>
                    <Th>Paid on</Th>
                    <Th>Status</Th>
                    <Th align="right">Still owed</Th>
                  </tr>
                </thead>
                <tbody>
                  {early.map(({ booking, ledger, line }) => (
                    <tr key={line.payment.id}>
                      <Td className="whitespace-nowrap">{booking.users?.email ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap">{booking.trips?.name ?? <Unknown />}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(Number(line.payment.amount))}
                      </Td>
                      <Td className="whitespace-nowrap text-[--text-secondary]">
                        <Day line={line} empty="Not yet" />
                      </Td>
                      <Td
                        className={
                          line.tone === "notice"
                            ? "whitespace-nowrap text-[--accent]"
                            : line.tone === "muted"
                              ? "whitespace-nowrap text-[--text-muted]"
                              : "whitespace-nowrap"
                        }
                      >
                        {line.label}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {booking.status === "cancelled"
                          ? "Cancelled"
                          : formatAmount(fromCents(ledger.remainingCents))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        <Panel
          title="Paid in full at booking"
          description={`${paidAtBooking.length} booking${paidAtBooking.length === 1 ? "" : "s"} paid the whole price at checkout. The deposit share of each is non-refundable, like any other deposit.`}
          bleed
        >
          {paidAtBooking.length === 0 ? (
            <div className="p-5">
              <EmptyState title="None yet">
                Bookings where the traveler chose to pay everything at checkout show up here once
                the payment clears.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="Bookings paid in full at booking">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Trip</Th>
                    <Th>Tier</Th>
                    <Th>Status</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Of which deposit</Th>
                  </tr>
                </thead>
                <tbody>
                  {paidAtBooking.map(({ booking, ledger }) => (
                    <tr key={booking.id}>
                      <Td className="whitespace-nowrap">{booking.users?.email ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap">{booking.trips?.name ?? <Unknown />}</Td>
                      <Td className="whitespace-nowrap text-[--text-secondary]">
                        {booking.tiers?.name ?? <Unknown />}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <BookingStatusBadge status={booking.status} plan={ledger.plan} />
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatAmount(fromCents(ledger.paidCents))}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {formatAmount(Number(booking.deposit_amount))}
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

function Day({ line, empty }: { line: LedgerLine; empty: string }) {
  return line.date ? <>{formatDay(line.date)}</> : <span className="text-[--text-muted]">{empty}</span>;
}

function Unknown() {
  return <span className="text-[--text-muted]">Unknown</span>;
}
