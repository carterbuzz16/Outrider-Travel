import { Badge, Button } from "@/components/ui";
import { formatPrice } from "@/lib/trips";
import { formatDay } from "@/app/(protected)/dates";
import {
  EmptyState,
  PAYMENT_STATUS_LABEL,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  type PaymentStatus,
} from "@/app/admin/admin-ui";

/**
 * The flagged-installment list, with no data access in it. Same split as the
 * other three admin screens.
 */

export type FlaggedPayment = {
  id: string;
  status: PaymentStatus;
  amount: number;
  scheduled_date: string | null;
  attempt_count: number;
  booking_id: string;
  bookings: { id: string; users: { email: string } | null; trips: { name: string } | null } | null;
};

export default function FlaggedPaymentsView({ payments }: { payments: FlaggedPayment[] }) {
  const rows = payments;
  const owed = rows.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Flagged installments"
        lede="Payments that failed on retry or are stuck waiting on the customer to authenticate with their bank. Both need a person."
        back={{ href: "/admin", label: "Overview" }}
        actions={
          <Button href="/admin" variant="secondary" size="sm">
            All bookings
          </Button>
        }
      />

      <div className="mt-10">
        <Panel
          title="Needs a person"
          description={
            rows.length === 0
              ? "Nothing is stuck right now."
              : `${rows.length} payment${rows.length === 1 ? "" : "s"}, ${formatPrice(owed)} outstanding.`
          }
          bleed
        >
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing flagged">
                Every installment is either scheduled, taken, or refunded. Failed charges and bank
                authentication requests show up here as soon as they happen.
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
                  {rows.map((payment) => (
                    <tr key={payment.id}>
                      <Td className="whitespace-nowrap">
                        {payment.bookings?.users?.email ?? (
                          <span className="text-[--text-muted]">Unknown</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {payment.bookings?.trips?.name ?? (
                          <span className="text-[--text-muted]">Unknown</span>
                        )}
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {formatPrice(Number(payment.amount))}
                      </Td>
                      <Td className="whitespace-nowrap text-[--text-secondary]">
                        {payment.scheduled_date ? (
                          formatDay(payment.scheduled_date)
                        ) : (
                          <span className="text-[--text-muted]">No date</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {/* Both statuses on this page are the reason it exists,
                            so both carry the flag rather than only failures. */}
                        <Badge tone="urgent">{PAYMENT_STATUS_LABEL[payment.status]}</Badge>
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-[--text-secondary]">
                        {payment.attempt_count}
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
