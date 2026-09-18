import { confirmationNumber } from "@/lib/confirmation-number";
import type { BookingStatus } from "@/app/admin/admin-ui";
import { readLedger, type Ledger, type LedgerPayment } from "@/app/admin/payment-ledger";

/*
 * The bookings list's rows and the filters over them, with no data access.
 *
 * Filtering happens here in memory rather than in the query. At this
 * company's volume (tens to low hundreds of bookings a season) one read of
 * every booking is cheap, and several of the filters cannot be pushed into
 * PostgREST anyway: "owes money" is a sum across payment rows worked out by
 * payment-ledger.ts, and the confirmation number is derived from the id, not
 * stored (lib/confirmation-number.ts).
 *
 * Pure, no server imports, so the view and the page share it.
 */

/** The columns the list selects. No traveler PII beyond name and email. */
export const BOOKING_ROW_SELECT =
  "id, status, total_amount, deposit_amount, group_code, created_at, flights_booked, rooming_submitted, details_submitted, sms_consent, users(email, name), trips(id, name, start_date, end_date), tiers(id, name), payments(id, amount, status, scheduled_date, attempt_count, paid_at), rooming_requests(submitted_at), traveler_details(submitted_at)";

export type BookingRow = {
  id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  created_at: string;
  flights_booked: boolean;
  rooming_submitted: boolean;
  details_submitted: boolean;
  sms_consent: boolean;
  users: { email: string; name: string | null } | null;
  trips: { id: string; name: string; start_date: string; end_date: string } | null;
  tiers: { id: string; name: string } | null;
  payments: LedgerPayment[];
  rooming_requests: { submitted_at: string } | null;
  traveler_details: { submitted_at: string } | null;
};

export type Tasks = { flights: boolean; rooming: boolean; details: boolean };

export type ListRow = {
  booking: BookingRow;
  ledger: Ledger;
  confirmation: string;
  tasks: Tasks;
  /** The next payment still expected, as YYYY-MM-DD, or null. */
  nextPayment: string | null;
  isNew: boolean;
};

/** A booking is new for a day after it was created. */
export const NEW_FOR_MS = 24 * 60 * 60 * 1000;

/**
 * The three portal tasks. The booking flags are what the portal sets, but the
 * rows are checked too: a flag write that failed after the row saved should
 * not show a traveler as behind when they are not.
 */
export function tasksFor(booking: Pick<BookingRow, "flights_booked" | "rooming_submitted" | "details_submitted" | "rooming_requests" | "traveler_details">): Tasks {
  return {
    flights: booking.flights_booked,
    rooming: booking.rooming_submitted || booking.rooming_requests !== null,
    details: booking.details_submitted || booking.traveler_details !== null,
  };
}

/**
 * The earliest installment still to be collected: scheduled, or failed and
 * waiting on a retry, or waiting on the traveler's bank. Cancelled and paid
 * rows are history.
 */
export function nextPaymentDate(ledger: Ledger, status: BookingStatus): string | null {
  if (status === "cancelled" || ledger.remainingCents === 0) return null;
  const open = ledger.lines
    .filter(
      (line) =>
        line.kind === "installment" &&
        (line.payment.status === "scheduled" ||
          line.payment.status === "failed" ||
          line.payment.status === "requires_action"),
    )
    .map((line) => line.date)
    .filter((date): date is string => date !== null)
    .sort();
  return open[0] ?? null;
}

export function toListRow(booking: BookingRow, today: string, nowMs: number): ListRow {
  const ledger = readLedger(booking, today);
  return {
    booking,
    ledger,
    confirmation: confirmationNumber(booking.id),
    tasks: tasksFor(booking),
    nextPayment: nextPaymentDate(ledger, booking.status),
    isNew: nowMs - new Date(booking.created_at).getTime() < NEW_FOR_MS,
  };
}

/* -- filters ----------------------------------------------------------------- */

export const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "live", label: "Live (not cancelled)" },
  { value: "pending", label: "Awaiting payment" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "paid_in_full", label: "Paid in full" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "owed", label: "Most owed" },
  { value: "departure", label: "Departure date" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

export type Filters = {
  q: string;
  trip: string;
  tier: string;
  status: string;
  owes: boolean;
  tasks: boolean;
  sort: Sort;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Reads the URL. Anything unrecognised falls back to "no filter" rather than an error. */
export function parseFilters(params: RawParams): Filters {
  const status = one(params.status);
  const sort = one(params.sort);
  return {
    q: one(params.q).slice(0, 120),
    trip: one(params.trip),
    tier: one(params.tier),
    status: STATUS_FILTERS.some((s) => s.value === status) ? status : "",
    owes: one(params.owes) === "1",
    tasks: one(params.tasks) === "incomplete",
    sort: (SORTS.some((s) => s.value === sort) ? sort : "newest") as Sort,
  };
}

/** The query string for a set of filters, leaving out the defaults so shared links stay short. */
export function filterHref(filters: Partial<Filters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.trip) params.set("trip", filters.trip);
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.status) params.set("status", filters.status);
  if (filters.owes) params.set("owes", "1");
  if (filters.tasks) params.set("tasks", "incomplete");
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export function isFiltered(filters: Filters): boolean {
  return Boolean(filters.q || filters.trip || filters.tier || filters.status || filters.owes || filters.tasks);
}

/** Letters and digits only, upper case: "or-7k2q9m" and "OR 7K2Q9M" both find OR-7K2Q9M. */
function compact(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function matchesSearch(row: ListRow, q: string): boolean {
  const needle = q.toLowerCase();
  const { booking } = row;
  if (booking.users?.email.toLowerCase().includes(needle)) return true;
  if (booking.users?.name?.toLowerCase().includes(needle)) return true;

  // Short fragments would match inside unrelated codes; a name search for
  // "al" should not turn up OR-7AL2Q9.
  const code = compact(q);
  if (code.length < 3) return false;
  const confirmation = compact(row.confirmation);
  // With or without the "OR" prefix; a bare "7K2Q" still finds it.
  if (confirmation.includes(code) || confirmation.slice(2).includes(code)) return true;
  if (booking.group_code && compact(booking.group_code).includes(code)) return true;
  return false;
}

export function applyFilters(rows: ListRow[], filters: Filters): ListRow[] {
  const filtered = rows.filter((row) => {
    const { booking } = row;
    if (filters.trip && booking.trips?.id !== filters.trip) return false;
    if (filters.tier && booking.tiers?.name !== filters.tier) return false;
    if (filters.status === "live" && booking.status === "cancelled") return false;
    if (filters.status && filters.status !== "live" && booking.status !== filters.status) return false;
    if (filters.owes && (booking.status === "cancelled" || row.ledger.remainingCents === 0)) return false;
    if (filters.tasks) {
      // Tasks only mean something once the booking is paid for and live.
      if (booking.status === "pending" || booking.status === "cancelled") return false;
      if (row.tasks.flights && row.tasks.rooming && row.tasks.details) return false;
    }
    if (filters.q && !matchesSearch(row, filters.q)) return false;
    return true;
  });

  const byNewest = (a: ListRow, b: ListRow) => b.booking.created_at.localeCompare(a.booking.created_at);
  switch (filters.sort) {
    case "oldest":
      return filtered.sort((a, b) => a.booking.created_at.localeCompare(b.booking.created_at));
    case "owed":
      return filtered.sort((a, b) => b.ledger.remainingCents - a.ledger.remainingCents || byNewest(a, b));
    case "departure":
      return filtered.sort(
        (a, b) =>
          (a.booking.trips?.start_date ?? "9999").localeCompare(b.booking.trips?.start_date ?? "9999") ||
          byNewest(a, b),
      );
    default:
      return filtered.sort(byNewest);
  }
}
