import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import type { TripStatus } from "@/components/ui";

/**
 * Public trip data.
 *
 * Read with the service-role client rather than the anon one, because RLS on
 * `trips` and `tiers` grants SELECT to `authenticated` only — a logged-out
 * visitor reading through the anon key gets nothing back. These pages are
 * server components, so the key never reaches the browser.
 *
 * The safety that RLS would otherwise give us is enforced here instead: every
 * export below funnels through `publishedTrips()`, which hard-codes
 * `status = 'published'`. Nothing in this module takes a status argument, and
 * nothing outside it gets a raw client — so a draft trip cannot leak through a
 * caller that forgot a filter.
 *
 * The cleaner long-term fix is an RLS policy granting `anon` SELECT on
 * published trips and their tiers, at which point this can move to the anon
 * client and drop the service role entirely.
 */

export type PublicTier = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  inclusions: string[];
  maxCapacity: number | null;
  /** null when the tier is uncapped. */
  spotsLeft: number | null;
};

export type PublicTrip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string | null;
  logistics: string | null;
  images: string[];
  tiers: PublicTier[];
  /** Lowest tier price — what "from $X" quotes. */
  priceFrom: number;
  /** Summed across capped tiers; null when every tier is uncapped. */
  spotsLeft: number | null;
  status: TripStatus;
};

// One unbroken literal on purpose: supabase-js infers the result type by
// parsing this string at the type level, and a concatenated one degrades to
// `GenericStringError` — every field then comes back as `never`.
const TRIP_COLUMNS =
  "id, name, destination, start_date, end_date, description, logistics, images, tiers(id, name, price, description, inclusions, max_capacity)";

/** A booking in any of these states is holding a spot. */
/*
 * What counts as a spot taken.
 *
 * `pending` is deliberately absent: a booking sits at pending from the moment
 * the row is created until Stripe confirms the deposit, which includes every
 * abandoned checkout. Counting those made departures look fuller than they
 * were, in the admin and on the public page.
 *
 * The trade-off is that two people can be in checkout for the last spot at the
 * same time and both succeed. With capacities in the tens and deposits taken
 * immediately, that is far less likely than the overcounting it replaces. If it
 * ever does bite, the fix is to count pending rows created in the last hour
 * rather than counting them forever.
 */
const SPOT_HOLDING: Database["public"]["Enums"]["booking_status"][] = [
  "deposit_paid",
  "paid_in_full",
];

export async function getPublishedTrips(): Promise<PublicTrip[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("trips")
    .select(TRIP_COLUMNS)
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (error) {
    // A marketing page should not 500 because the trip list is briefly
    // unavailable — the section renders its empty state instead.
    console.error(`Failed to load published trips: ${error.code} — ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  const taken = await countTakenSpots(data.map((t) => t.id));
  return data.map((trip) => toPublicTrip(trip, taken));
}

export async function getPublishedTrip(id: string): Promise<PublicTrip | null> {
  // Guard the shape before it reaches Postgres: a non-uuid path segment makes
  // the query error out rather than simply miss, which would surface as a 500
  // on what should be a plain 404.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trips")
    .select(TRIP_COLUMNS)
    .eq("status", "published")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load trip ${id}: ${error.code} — ${error.message}`);
    return null;
  }
  if (!data) return null;

  const taken = await countTakenSpots([data.id]);
  return toPublicTrip(data, taken);
}

/** Bookings per tier, so a capped tier can show what's actually left. */
async function countTakenSpots(tripIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (tripIds.length === 0) return counts;

  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("tier_id")
    .in("trip_id", tripIds)
    .in("status", SPOT_HOLDING);

  if (error) {
    // Availability is a nice-to-have; losing it must not take the page with
    // it. Every tier then reads as uncapped rather than falsely sold out.
    console.error(`Failed to count bookings: ${error.code} — ${error.message}`);
    return counts;
  }

  for (const row of data ?? []) {
    counts.set(row.tier_id, (counts.get(row.tier_id) ?? 0) + 1);
  }
  return counts;
}

type TripRow = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string | null;
  logistics: string | null;
  images: string[];
  tiers: {
    id: string;
    name: string;
    price: number | string;
    description: string | null;
    inclusions: string[] | null;
    max_capacity: number | null;
  }[];
};

function toPublicTrip(row: TripRow, taken: Map<string, number>): PublicTrip {
  const tiers: PublicTier[] = [...row.tiers]
    // Decimal columns come back as strings through PostgREST when they exceed
    // what a JS number holds exactly; Number() here keeps the rest of the app
    // dealing in one type.
    .map((tier) => {
      const capacity = tier.max_capacity;
      return {
        id: tier.id,
        name: tier.name,
        price: Number(tier.price),
        description: tier.description,
        inclusions: tier.inclusions ?? [],
        maxCapacity: capacity,
        spotsLeft: capacity === null ? null : Math.max(0, capacity - (taken.get(tier.id) ?? 0)),
      };
    })
    .sort((a, b) => a.price - b.price);

  const capped = tiers.filter((t) => t.spotsLeft !== null);
  const spotsLeft = capped.length === 0 ? null : capped.reduce((n, t) => n + (t.spotsLeft ?? 0), 0);

  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    logistics: row.logistics,
    images: row.images ?? [],
    tiers,
    priceFrom: tiers.length > 0 ? tiers[0].price : 0,
    spotsLeft,
    status: deriveStatus(spotsLeft, row.start_date),
  };
}

/**
 * Maps availability onto the design system's trip statuses. Deliberately
 * coarse — an exact "3 of 30 left" reads as pressure-selling, and a threshold
 * survives a booking landing between render and read.
 */
function deriveStatus(spotsLeft: number | null, startDate: string): TripStatus {
  if (isPast(startDate)) return "soldOut";
  if (spotsLeft === null) return "open";
  if (spotsLeft <= 0) return "soldOut";
  if (spotsLeft <= 6) return "few";
  return "open";
}

function isPast(date: string): boolean {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return date < todayIso;
}

/**
 * How availability is described.
 *
 * Deliberately qualitative. An exact count ("3 spots left") reads as a
 * pressure tactic, goes stale between render and read, and tells competitors
 * exactly how a departure is selling. The underlying number still drives which
 * phrase is shown; it just never reaches the page.
 */
export function availabilityLabel(status: TripStatus): string {
  switch (status) {
    case "soldOut":
      return "Sold out";
    case "few":
      return "Going quickly";
    default:
      return "Spots available";
  }
}

/** The same idea for a single tier, which has its own count. */
export function tierAvailabilityLabel(spotsLeft: number | null): string | null {
  if (spotsLeft === null) return null;
  if (spotsLeft <= 0) return "Sold out";
  if (spotsLeft <= 6) return "Selling out fast";
  return null;
}

/* -- formatting ----------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parsed by hand: `new Date("2026-12-14")` is UTC midnight, which renders as
 *  the 13th anywhere west of Greenwich. */
function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "Dec 14–18, 2026", collapsing the month and year when they match. */
export function formatDateRange(startDate: string, endDate: string): string {
  const s = parts(startDate);
  const e = parts(endDate);
  if (s.y === e.y && s.m === e.m) return `${MONTHS[s.m]} ${s.d}–${e.d}, ${s.y}`;
  if (s.y === e.y) return `${MONTHS[s.m]} ${s.d} – ${MONTHS[e.m]} ${e.d}, ${s.y}`;
  return `${MONTHS[s.m]} ${s.d}, ${s.y} – ${MONTHS[e.m]} ${e.d}, ${e.y}`;
}

/** Whole dollars — every price in the system is a round number. */
export function formatPrice(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function nightCount(startDate: string, endDate: string): number {
  const s = parts(startDate);
  const e = parts(endDate);
  const ms = Date.UTC(e.y, e.m, e.d) - Date.UTC(s.y, s.m, s.d);
  return Math.max(0, Math.round(ms / 86_400_000));
}
