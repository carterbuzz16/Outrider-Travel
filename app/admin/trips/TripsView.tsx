import Link from "next/link";
import { Button } from "@/components/ui";
import { formatDateRange } from "@/lib/trips";
import {
  EmptyState,
  Fill,
  Figure,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  TripStatusBadge,
  countHeld,
  totalCapacity,
  type BookingStatus,
  type TripStatus,
} from "@/app/admin/admin-ui";

/**
 * The trip list, with no data access in it. Same split as TripEditor and
 * BookingsView: the page is a loader, this is the screen, and every state
 * (empty, all drafts, a full departure) can be rendered from fixtures.
 */

export type TripListRow = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  tiers: { id: string; max_capacity: number | null }[];
  bookings: { id: string; status: BookingStatus }[];
};

export default function TripsView({ trips }: { trips: TripListRow[] }) {
  const rows = trips;
  const published = rows.filter((trip) => trip.status === "published");
  const drafts = rows.filter((trip) => trip.status === "draft");

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Trips"
        lede="Every departure on the system. A trip is only on the public site while its status is published."
        back={{ href: "/admin", label: "Overview" }}
        actions={
          <Button href="/admin/trips/new" variant="primary" size="sm">
            New trip
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Figure label="All trips" value={rows.length} />
        <Figure label="Published" value={published.length} note="Live on the public site" />
        <Figure label="Drafts" value={drafts.length} note="Hidden from customers" />
        <Figure
          label="Spots held"
          value={rows.reduce((sum, trip) => sum + countHeld(trip.bookings ?? []), 0)}
          note="Across every departure"
        />
      </div>

      <div className="mt-10">
        <Panel title="All trips" description="Newest departure date first." bleed>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No trips yet"
                action={
                  <Button href="/admin/trips/new" variant="primary" size="sm">
                    Create the first trip
                  </Button>
                }
              >
                Trips are written here, not in code. Create one as a draft, add its tiers, then
                publish it when the dates and prices are settled.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="All trips">
              <Table>
                <thead>
                  <tr>
                    <Th>Trip</Th>
                    <Th>Destination</Th>
                    <Th>Dates</Th>
                    <Th>Status</Th>
                    <Th align="right">Tiers</Th>
                    <Th>How full</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trip) => {
                    const tiers = trip.tiers ?? [];
                    const bookings = trip.bookings ?? [];
                    return (
                      <tr key={trip.id}>
                        {/* No wrapping on the name: in a table the row should stay one
                            line and the container scrolls, rather than every row
                            growing to three lines on a narrow screen. */}
                        <Td className="whitespace-nowrap">
                          <Link
                            href={`/admin/trips/${trip.id}`}
                            className="text-[--text] underline decoration-[--rule-strong] underline-offset-4 transition-colors duration-fast hover:text-[--accent] hover:decoration-[--accent]"
                          >
                            {trip.name}
                          </Link>
                        </Td>
                        <Td className="whitespace-nowrap text-[--text-secondary]">
                          {trip.destination}
                        </Td>
                        <Td className="whitespace-nowrap text-[--text-secondary]">
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </Td>
                        <Td className="whitespace-nowrap">
                          <TripStatusBadge status={trip.status} />
                        </Td>
                        <Td align="right" className="whitespace-nowrap">
                          {tiers.length === 0 ? (
                            // Zero tiers is only a problem once the trip is
                            // live: a published trip with none has nothing to
                            // sell, so there the count is the warning. On a
                            // draft it is just where every trip starts.
                            <span
                              className={
                                trip.status === "published"
                                  ? "text-[--flag-ink]"
                                  : "text-[--text-muted]"
                              }
                            >
                              0
                            </span>
                          ) : (
                            tiers.length
                          )}
                        </Td>
                        <Td className="min-w-[10rem]">
                          <Fill booked={countHeld(bookings)} capacity={totalCapacity(tiers)} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </main>
  );
}
