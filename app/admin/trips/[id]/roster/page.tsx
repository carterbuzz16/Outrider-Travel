import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { isBookingId } from "@/lib/portal-token";
import { formatDateRange } from "@/lib/trips";
import {
  BookingStatusBadge,
  EmptyState,
  Figure,
  Fill,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  countHeld,
  countPending,
  totalCapacity,
} from "@/app/admin/admin-ui";
import { Missing, TaskTicks, linkClass } from "@/app/admin/bookings/bits";
import { formatShortStamp } from "@/app/admin/bookings/format";
import { filterHref } from "@/app/admin/bookings/booking-rows";
import { loadRoster, roomingOrder, type RosterBooking } from "./roster-data";

export const metadata: Metadata = {
  title: "Roster",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const EXPORTS = [
  { kind: "roster", label: "Full roster", note: "Money and task state" },
  { kind: "rooming", label: "Rooming list", note: "For the Peaks" },
  { kind: "rentals", label: "Rentals", note: "For the ski shop" },
  { kind: "insurance", label: "Insurance", note: "Legal name, date of birth" },
  { kind: "dietary", label: "Dietary", note: "Restrictions only" },
  { kind: "emergency", label: "Emergency contacts", note: "Phones" },
] as const;

/**
 * One departure's roster: how full each package is, the penthouses, the
 * rooming list in the order requests came in, and how far everyone is with
 * the three trip-page tasks. No personal details on the page itself; those
 * are only in the CSVs, which log each download.
 */
export default async function TripRosterPage(props: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await props.params;
  if (!isBookingId(id)) notFound();

  const roster = await loadRoster(id);
  if (!roster) notFound();

  const { trip, tiers, all, held } = roster;
  const capacity = totalCapacity(tiers);
  const pending = countPending(all);
  const cancelled = all.filter((b) => b.status === "cancelled").length;
  const done = {
    flights: held.filter((b) => b.tasks.flights).length,
    rooming: held.filter((b) => b.tasks.rooming).length,
    details: held.filter((b) => b.tasks.details).length,
  };
  const allDone = held.filter((b) => b.tasks.flights && b.tasks.rooming && b.tasks.details).length;
  const rooming = roomingOrder(held);
  const penthouses = tiers.filter((t) => t.isPenthouse);

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Roster"
        title={trip.name}
        lede={`${trip.destination} · ${formatDateRange(trip.start_date, trip.end_date)}`}
        back={{ href: `/admin/trips/${trip.id}`, label: "Trip editor" }}
      />

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Figure
          label="Spots held"
          value={capacity === null ? held.length : `${held.length} / ${capacity}`}
          note={capacity === null ? "At least one package has no cap" : `${Math.max(0, capacity - held.length)} left`}
        />
        <Figure
          label="Awaiting payment"
          value={pending}
          note={cancelled > 0 ? `${cancelled} cancelled` : "Checkouts started, not paid"}
        />
        <Figure label="All three tasks done" value={`${allDone} / ${held.length}`} />
        <Figure
          label="Bookings list"
          value={
            <Link href={filterHref({ trip: trip.id })} className={`text-body ${linkClass}`}>
              Open
            </Link>
          }
          note="Every booking on this departure"
        />
      </div>

      {/* -- exports ----------------------------------------------------------- */}
      <div className="mt-10">
        <Panel
          title="Downloads"
          description="CSV, spots held only. Rentals, insurance, dietary and emergency contacts carry personal details: each download is logged against your account. Travelers who have not sent their details yet are listed with blanks."
        >
          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORTS.map((e) => (
              <li key={e.kind}>
                {/* A plain anchor: a download, not a page, and never prefetched. */}
                <a
                  href={`/admin/trips/${trip.id}/roster/export/${e.kind}`}
                  download={`${roster.filePrefix}-${e.kind}.csv`}
                  className="flex items-center justify-between gap-3 border border-[--rule-strong] px-4 py-3 no-underline transition-colors duration-fast hover:border-[--text]"
                >
                  <span>
                    <span className="t-micro block text-[--text]">{e.label}</span>
                    <span className="mt-1 block font-body text-body-s text-[--text-muted]">{e.note}</span>
                  </span>
                  <span className="t-micro text-[--accent]">CSV</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* -- packages -------------------------------------------------------- */}
        <Panel title="Packages" bleed>
          {tiers.length === 0 ? (
            <p className="p-5 font-body text-body-s text-[--text-muted]">This departure has no packages.</p>
          ) : (
            <TableScroll label="Packages">
              <Table>
                <thead>
                  <tr>
                    <Th>Package</Th>
                    <Th>Held / capacity</Th>
                    <Th align="right">Awaiting</Th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => {
                    const onTier = all.filter((b) => b.tierId === tier.id);
                    return (
                      <tr key={tier.id}>
                        <Td className="whitespace-nowrap">
                          <Link href={filterHref({ trip: trip.id, tier: tier.name })} className={linkClass}>
                            {tier.name}
                          </Link>
                        </Td>
                        <Td className="min-w-[10rem]">
                          <Fill booked={countHeld(onTier)} capacity={tier.max_capacity} />
                        </Td>
                        <Td align="right">{countPending(onTier) || <Missing>0</Missing>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        {/* -- tasks ----------------------------------------------------------- */}
        <Panel title="Trip page tasks" description={`Of the ${held.length} holding a spot.`}>
          <dl>
            <TaskLine label="Flights booked" done={done.flights} of={held.length} />
            <TaskLine label="Rooming request sent" done={done.rooming} of={held.length} />
            <TaskLine label="Traveler details sent" done={done.details} of={held.length} />
          </dl>
          {held.length > allDone && (
            <p className="mt-4 font-body text-body-s">
              <Link href={filterHref({ trip: trip.id, tasks: true })} className={linkClass}>
                See the {held.length - allDone} with tasks outstanding
              </Link>
            </p>
          )}
        </Panel>
      </div>

      {/* -- penthouses -------------------------------------------------------- */}
      {penthouses.length > 0 && (
        <div className="mt-8">
          <Panel
            title="Penthouses"
            description="Each penthouse is its own package that one group books whole."
          >
            <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
              {penthouses.map((tier) => {
                const onTier = all.filter((b) => b.tierId === tier.id);
                const heldHere = onTier.filter((b) => b.status === "deposit_paid" || b.status === "paid_in_full");
                const groups = [...new Set(heldHere.map((b) => b.group_code).filter(Boolean))];
                const full = tier.max_capacity !== null && heldHere.length >= tier.max_capacity;
                return (
                  <li key={tier.id} className="border-t border-[--rule-strong] pt-3.5">
                    <p className="t-micro text-[--text]">{tier.name}</p>
                    <div className="mt-2.5">
                      <Fill booked={heldHere.length} capacity={tier.max_capacity} />
                    </div>
                    <p className="mt-2 font-body text-body-s text-[--text-secondary]">
                      {full ? "Claimed in full" : heldHere.length === 0 ? "Open, nobody has paid" : "Claim in progress"}
                      {groups.length > 0 && ` · group ${groups.join(", ")}`}
                      {countPending(onTier) > 0 && ` · ${countPending(onTier)} awaiting payment`}
                    </p>
                    {groups.length > 1 && (
                      <p className="mt-1 font-body text-body-s text-[--flag-ink]">
                        More than one group code holds this penthouse.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      )}

      {/* -- rooming list ------------------------------------------------------ */}
      <div className="mt-8">
        <Panel
          title="Rooming list"
          description="In the order requests first arrived; first come, first placed. Those who have not sent one are at the bottom."
          bleed
        >
          {held.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nobody on the roster yet">
                Travelers appear here once their deposit or full payment clears.
              </EmptyState>
            </div>
          ) : (
            <TableScroll label="Rooming list">
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Traveler</Th>
                    <Th>Package</Th>
                    <Th>Group</Th>
                    <Th>Request</Th>
                    <Th>Sent</Th>
                    <Th>Tasks</Th>
                  </tr>
                </thead>
                <tbody>
                  {rooming.map((b, i) => (
                    <RoomingRow key={b.id} booking={b} order={b.rooming ? i + 1 : null} />
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

function TaskLine({ label, done, of }: { label: string; done: number; of: number }) {
  return (
    <div className="border-b border-[--rule-faint] py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="t-micro text-[--text-secondary]">{label}</dt>
        <dd className="font-body text-body-s tabular-nums text-[--text]">
          {done} of {of}
        </dd>
      </div>
      <span aria-hidden="true" className="mt-2 block h-[3px] w-full bg-[--rule-faint]">
        <span className="block h-full bg-[--accent]" style={{ width: `${of === 0 ? 0 : Math.round((done / of) * 100)}%` }} />
      </span>
    </div>
  );
}

function RoomingRow({ booking, order }: { booking: RosterBooking; order: number | null }) {
  return (
    <tr>
      <Td className="whitespace-nowrap tabular-nums text-[--text-secondary]">{order ?? "—"}</Td>
      <Td className="whitespace-nowrap">
        <Link href={`/admin/bookings/${booking.id}`} className={linkClass}>
          {booking.name || booking.email || "Unnamed"}
        </Link>
        <span className="ml-2 inline-block align-middle">
          <BookingStatusBadge status={booking.status} />
        </span>
      </Td>
      <Td className="whitespace-nowrap">{booking.tierName ?? <Missing />}</Td>
      <Td className="whitespace-nowrap font-mono">{booking.group_code ?? <Missing>—</Missing>}</Td>
      <Td className="min-w-[12rem]">
        {!booking.rooming ? (
          <Missing>Not sent yet</Missing>
        ) : booking.rooming.no_preference ? (
          "No preference"
        ) : (
          booking.rooming.roommate_names.join(", ") || <Missing>No names</Missing>
        )}
      </Td>
      <Td className="whitespace-nowrap text-[--text-secondary]">
        {booking.rooming ? formatShortStamp(booking.rooming.submitted_at) : "—"}
      </Td>
      <Td className="whitespace-nowrap">
        <TaskTicks tasks={booking.tasks} />
      </Td>
    </tr>
  );
}
