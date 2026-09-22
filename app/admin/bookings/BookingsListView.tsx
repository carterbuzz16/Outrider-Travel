import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
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
import LiveRefresh from "./LiveRefresh";
import { Missing, NewMark, TaskTicks, YesNo, linkClass } from "./bits";
import { formatShortStamp } from "./format";
import {
  SORTS,
  STATUS_FILTERS,
  filterHref,
  isFiltered,
  type Filters,
  type ListRow,
} from "./booking-rows";

/**
 * The full bookings list, with no data access in it (page.tsx loads).
 *
 * Every filter is a query-string parameter and the form is a plain GET, so a
 * filtered view is a link the owner can bookmark or send, and the page works
 * before any JavaScript arrives. The only client piece is LiveRefresh.
 *
 * Two layouts: a dense table from md up, and a stack of cards on a phone,
 * where a twelve-column table would be all sideways scrolling.
 */
export default function BookingsListView({
  rows,
  total,
  newCount,
  filters,
  trips,
  tiers,
  renderedAt,
  loadFailed,
}: {
  rows: ListRow[];
  total: number;
  newCount: number;
  filters: Filters;
  trips: { id: string; name: string; start_date: string }[];
  tiers: string[];
  renderedAt: string;
  loadFailed: boolean;
}) {
  const filtered = isFiltered(filters);
  const owedCents = rows.reduce(
    (sum, row) => sum + (row.booking.status === "cancelled" ? 0 : row.ledger.remainingCents),
    0,
  );

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="Bookings"
        lede="Every booking as it comes in, newest first. The list refreshes itself every 30 seconds while this tab is open."
        back={{ href: "/admin", label: "Overview" }}
        actions={<LiveRefresh renderedAt={renderedAt} />}
      />

      {loadFailed && (
        <p role="alert" className="mt-6 border border-[--flag] px-4 py-3 font-body text-body-s text-[--flag-ink]">
          The bookings could not be loaded. The next refresh will try again.
        </p>
      )}

      {/* Quick views: the handful of questions asked most, one tap each. */}
      <nav aria-label="Quick views" className="mt-6 flex flex-wrap gap-2">
        <QuickLink href="/admin/bookings" active={!filtered}>
          All ({total})
        </QuickLink>
        <QuickLink href={filterHref({ status: "pending" })} active={filters.status === "pending" && !filters.owes}>
          Awaiting payment
        </QuickLink>
        <QuickLink href={filterHref({ owes: true })} active={filters.owes && !filters.status}>
          Owes money
        </QuickLink>
        <QuickLink href={filterHref({ tasks: true })} active={filters.tasks && !filters.status}>
          Tasks incomplete
        </QuickLink>
        <QuickLink href={filterHref({ status: "cancelled" })} active={filters.status === "cancelled"}>
          Cancelled
        </QuickLink>
        {newCount > 0 && (
          <span className="t-micro self-center pl-1 text-[--accent]">
            {newCount} new in the last 24 hours
          </span>
        )}
      </nav>

      <FilterForm filters={filters} trips={trips} tiers={tiers} />

      <div className="mt-8">
        <Panel
          title={filtered ? "Matching bookings" : "All bookings"}
          description={
            <>
              {rows.length} of {total} booking{total === 1 ? "" : "s"}
              {owedCents > 0 && <>, {formatAmount(fromCents(owedCents))} still owed</>}.
            </>
          }
          actions={
            filtered ? (
              <Button href="/admin/bookings" variant="secondary" size="sm">
                Clear filters
              </Button>
            ) : undefined
          }
          bleed
        >
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={filtered ? "Nothing matches" : "No bookings yet"}>
                {filtered
                  ? "No booking fits every filter above. Loosen one, or clear them all."
                  : "Bookings land here the moment someone starts checkout, and turn paid when Stripe confirms the money."}
              </EmptyState>
            </div>
          ) : (
            <>
              <ul className="list-none divide-y divide-[--rule-faint] p-0 md:hidden">
                {rows.map((row) => (
                  <BookingCard key={row.booking.id} row={row} />
                ))}
              </ul>
              <div className="hidden md:block">
                <BookingsTable rows={rows} />
              </div>
            </>
          )}
        </Panel>
      </div>
    </main>
  );
}

function QuickLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "t-micro border border-[--text] bg-[--text] px-3 py-2 text-[--surface] no-underline"
          : "t-micro border border-[--rule-strong] px-3 py-2 text-[--text-secondary] no-underline transition-colors duration-fast hover:border-[--text] hover:text-[--text]"
      }
    >
      {children}
    </Link>
  );
}

function FilterForm({
  filters,
  trips,
  tiers,
}: {
  filters: Filters;
  trips: { id: string; name: string; start_date: string }[];
  tiers: string[];
}) {
  return (
    <form method="get" action="/admin/bookings" className="mt-6 border border-[--rule] bg-[--surface-raised] p-4" role="search">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
          <span className="t-micro text-[--text-secondary]">Search</span>
          <Input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, email, OR-7K2Q9M, group code"
            autoComplete="off"
            className="py-2"
          />
        </label>
        <FilterSelect label="Departure" name="trip" value={filters.trip}>
          <option value="">All departures</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name}, {formatDay(trip.start_date)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Package" name="tier" value={filters.tier}>
          <option value="">All packages</option>
          {tiers.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Status" name="status" value={filters.status}>
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Sort" name="sort" value={filters.sort}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterCheck name="owes" value="1" checked={filters.owes} label="Owes money" />
        <FilterCheck name="tasks" value="incomplete" checked={filters.tasks} label="Tasks incomplete" />
        <div className="ml-auto flex items-center gap-3">
          <Link href="/admin/bookings" className={`t-micro ${linkClass}`}>
            Reset
          </Link>
          <Button type="submit" variant="primary" size="sm">
            Apply
          </Button>
        </div>
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="t-micro text-[--text-secondary]">{label}</span>
      <Select name={name} defaultValue={value} className="py-2">
        {children}
      </Select>
    </label>
  );
}

function FilterCheck({ name, value, checked, label }: { name: string; value: string; checked: boolean; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 font-body text-body-s text-[--text]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-4 w-4 accent-[--accent-solid]"
      />
      {label}
    </label>
  );
}

function PlanLabel({ row }: { row: ListRow }) {
  return <>{row.ledger.plan === "full" ? "Pay in full" : "Deposit"}</>;
}

function Money({ row }: { row: ListRow }) {
  const { booking, ledger } = row;
  return (
    <>
      <span className="text-[--text]">{formatAmount(fromCents(ledger.paidCents))}</span>
      <span className="text-[--text-muted]"> / {formatAmount(Number(booking.total_amount))}</span>
      <span className="mt-1 block">
        {booking.status === "cancelled" ? (
          <span className="text-[--text-muted]">Cancelled</span>
        ) : ledger.overpaidCents > 0 ? (
          <span className="text-[--flag-ink]">Overpaid {formatAmount(fromCents(ledger.overpaidCents))}</span>
        ) : ledger.remainingCents > 0 ? (
          <span className="text-[--text-secondary]">{formatAmount(fromCents(ledger.remainingCents))} to go</span>
        ) : (
          <span className="text-[--text-muted]">Nothing owed</span>
        )}
      </span>
    </>
  );
}

function BookingsTable({ rows }: { rows: ListRow[] }) {
  return (
    <TableScroll label="Bookings">
      <Table>
        <thead>
          <tr>
            <Th>Confirmation</Th>
            <Th>Traveler</Th>
            <Th>Departure</Th>
            <Th>Package</Th>
            <Th>Status</Th>
            <Th align="right">Paid / total</Th>
            <Th>Next payment</Th>
            <Th>Group</Th>
            <Th>
              <span title="Flights, rooming, details">Tasks</span>
            </Th>
            <Th>SMS</Th>
            <Th>Booked</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { booking } = row;
            const href = `/admin/bookings/${booking.id}`;
            return (
              <tr key={booking.id} className={row.isNew ? "bg-[--surface]" : undefined}>
                <Td className="whitespace-nowrap">
                  <Link href={href} className={`font-mono ${linkClass}`}>
                    {row.confirmation}
                  </Link>
                  {row.isNew && <NewMark />}
                </Td>
                <Td className="whitespace-nowrap">
                  <Link href={href} className="text-[--text] no-underline hover:text-[--accent]">
                    {booking.users?.name || <Missing>No name</Missing>}
                  </Link>
                  <span className="mt-1 block text-[--text-muted]">{booking.users?.email ?? "No email"}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  {booking.trips?.name ?? <Missing />}
                  {booking.trips && (
                    <span className="mt-1 block text-[--text-muted]">{formatDay(booking.trips.start_date)}</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {booking.tiers?.name ?? <Missing />}
                  <span className="mt-1 block text-[--text-muted]">
                    <PlanLabel row={row} />
                  </span>
                </Td>
                <Td className="whitespace-nowrap">
                  <BookingStatusBadge status={booking.status} plan={row.ledger.plan} />
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  <Money row={row} />
                </Td>
                <Td className="whitespace-nowrap">
                  {row.nextPayment ? formatDay(row.nextPayment) : <Missing>—</Missing>}
                </Td>
                <Td className="whitespace-nowrap font-mono">
                  {booking.group_code ? (
                    <Link href={`/admin/bookings?q=${encodeURIComponent(booking.group_code)}`} className={linkClass}>
                      {booking.group_code}
                    </Link>
                  ) : (
                    <Missing>—</Missing>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <TaskTicks tasks={row.tasks} />
                </Td>
                <Td className="whitespace-nowrap">
                  <YesNo value={booking.sms_consent} />
                </Td>
                <Td className="whitespace-nowrap text-[--text-secondary]">
                  {formatShortStamp(booking.created_at)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableScroll>
  );
}

/** The phone layout: one tappable card per booking, the same facts in a stack. */
function BookingCard({ row }: { row: ListRow }) {
  const { booking } = row;
  return (
    <li>
      <Link
        href={`/admin/bookings/${booking.id}`}
        className={`block px-4 py-4 no-underline transition-colors duration-fast hover:bg-[--surface] ${row.isNew ? "bg-[--surface]" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-body-s text-[--text]">
              {booking.users?.name || booking.users?.email || "No name"}
              {row.isNew && <NewMark />}
            </p>
            {booking.users?.name && (
              <p className="mt-0.5 truncate font-body text-body-s text-[--text-muted]">{booking.users.email}</p>
            )}
          </div>
          <BookingStatusBadge status={booking.status} plan={row.ledger.plan} />
        </div>
        <p className="mt-2 font-body text-body-s text-[--text-secondary]">
          <span className="font-mono text-[--text]">{row.confirmation}</span>
          {", "}
          {booking.trips?.name ?? "No trip"}
          {booking.trips && `, ${formatDay(booking.trips.start_date)}`}
          {", "}
          {booking.tiers?.name ?? "No package"}
        </p>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3 font-body text-body-s tabular-nums">
          <div>
            <Money row={row} />
            {row.nextPayment && (
              <span className="block text-[--text-muted]">Next {formatDay(row.nextPayment)}</span>
            )}
          </div>
          <div className="text-right">
            <TaskTicks tasks={row.tasks} />
            <span className="mt-1 block text-[--text-muted]">{formatShortStamp(booking.created_at)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
