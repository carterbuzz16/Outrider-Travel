import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TripStatus } from "@/components/ui";
import { CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import {
  activeBookingFilter,
  claimMatches,
  getPenthouseProgress,
  getTierClaims,
  normalizeGroupCode,
  type TierClaim,
} from "@/lib/tier-claims";
import { toSnapshot, type PenthouseSnapshot } from "@/lib/penthouse";
import { hasDeparted } from "@/lib/mountain-time";

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
  /** Bought out by one friend group (the penthouses). See lib/tier-claims.ts. */
  groupExclusive: boolean;
  /**
   * A group-exclusive tier some group already holds: taken for everyone who
   * does not have that group's code. Always false for other tiers. The code
   * itself is never on this type; see groupCodeMatchesClaim.
   */
  claimed: boolean;
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
  /** Summed across capped tiers, a claimed penthouse counting as none left; null when every tier is uncapped. */
  spotsLeft: number | null;
  status: TripStatus;
};

// One unbroken literal on purpose: supabase-js infers the result type by
// parsing this string at the type level, and a concatenated one degrades to
// `GenericStringError` — every field then comes back as `never`.
const TRIP_COLUMNS =
  "id, name, destination, start_date, end_date, description, logistics, images, tiers(id, name, price, description, inclusions, max_capacity, group_exclusive)";

/*
 * What counts as a spot taken: the same rule as the check_tier_capacity
 * trigger and the penthouse claim (activeBookingFilter in lib/tier-claims.ts).
 * Paid, or pending and created within the last 30 minutes. An abandoned
 * checkout stops counting once its 30 minutes are up, and two people in
 * checkout for the last spot are not both shown it as open.
 */

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
  const trips = (data ?? []).filter(isVisible);
  if (trips.length === 0) return [];

  const [taken, claims] = await Promise.all([countTakenSpots(trips.map((t) => t.id)), readClaims(trips)]);
  return trips.map((trip) => toPublicTrip(trip, taken, claims));
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
  if (!data || !isVisible(data)) return null;

  const [taken, claims] = await Promise.all([countTakenSpots([data.id]), readClaims([data])]);
  return toPublicTrip(data, taken, claims);
}

/** Test trips are published so they can be booked, but only the sandbox shows them. */
function isVisible(trip: { name: string }): boolean {
  return CHECKOUT_SANDBOX || !isTestTrip(trip.name);
}

/** Bookings per tier, so a capped tier can show what's actually left. */
async function countTakenSpots(tripIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (tripIds.length === 0) return counts;

  const { data, error } = await createAdminClient()
    .from("bookings")
    .select("tier_id")
    .in("trip_id", tripIds)
    .or(activeBookingFilter());

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

/** Claims on the group-exclusive tiers of these trips. Used for `claimed` only; the codes stay here. */
function readClaims(trips: TripRow[]): Promise<Map<string, TierClaim>> {
  const ids = trips.flatMap((trip) => trip.tiers.filter((t) => t.group_exclusive).map((t) => t.id));
  return getTierClaims(createAdminClient(), ids);
}

/**
 * Whether `code` is the group code holding this penthouse. Server-only (this
 * module is), and it answers yes or no: the claim's code never leaves it.
 * False for a tier nobody holds, and for a tier that is not group-exclusive.
 */
export async function groupCodeMatchesClaim(tierId: string, code: string | null | undefined): Promise<boolean> {
  if (!normalizeGroupCode(code)) return false;
  const admin = createAdminClient();
  const { data: tier } = await admin.from("tiers").select("group_exclusive").eq("id", tierId).maybeSingle();
  if (!tier?.group_exclusive) return false;
  const claims = await getTierClaims(admin, [tierId]);
  return claimMatches(claims.get(tierId), code);
}

/**
 * What a group code typed on the booking page means for one departure: the
 * claimed tiers it opens, and whether it belongs to anyone on the trip at all
 * (a Base or Mid group, say). Yes/no answers only, for the same reason as above.
 */
export async function checkGroupCode(
  trip: PublicTrip,
  code: string | null | undefined,
): Promise<{
  code: string | null;
  knownOnTrip: boolean;
  unlocks: string[];
  /** Fill progress of each penthouse this code opens; only ever for those. */
  progress: Record<string, PenthouseSnapshot>;
}> {
  const wanted = normalizeGroupCode(code);
  if (!wanted) return { code: null, knownOnTrip: false, unlocks: [], progress: {} };

  const admin = createAdminClient();
  const claimedIds = trip.tiers.filter((t) => t.claimed).map((t) => t.id);
  const [claims, { data: member }] = await Promise.all([
    getTierClaims(admin, claimedIds),
    admin.from("bookings").select("id").eq("trip_id", trip.id).eq("group_code", wanted).limit(1).maybeSingle(),
  ]);
  const unlocks = claimedIds.filter((id) => claimMatches(claims.get(id), wanted));
  const fills = await getPenthouseProgress(
    admin,
    unlocks.map((id) => ({ id, tier_id: id, group_code: wanted })),
  );
  const progress: Record<string, PenthouseSnapshot> = {};
  for (const [id, fill] of fills) progress[id] = toSnapshot(fill);
  return { code: wanted, knownOnTrip: Boolean(member) || unlocks.length > 0, unlocks, progress };
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
    group_exclusive: boolean;
  }[];
};

function toPublicTrip(row: TripRow, taken: Map<string, number>, claims: Map<string, TierClaim>): PublicTrip {
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
        groupExclusive: tier.group_exclusive,
        claimed: tier.group_exclusive && claims.has(tier.id),
      };
    })
    .sort((a, b) => a.price - b.price);

  const capped = tiers.filter((t) => t.spotsLeft !== null);
  // A held penthouse's empty beds belong to that group, not to the public, so
  // they do not keep a departure reading as open.
  const spotsLeft =
    capped.length === 0 ? null : capped.reduce((n, t) => n + (t.claimed ? 0 : (t.spotsLeft ?? 0)), 0);

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
  // A departure that leaves today or has left takes no more bookings
  // (createBooking refuses it too), so it reads as closed everywhere.
  if (hasDeparted(startDate)) return "soldOut";
  if (spotsLeft === null) return "open";
  if (spotsLeft <= 0) return "soldOut";
  if (spotsLeft <= 6) return "few";
  return "open";
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
      return "Few places left";
    default:
      return "Spots available";
  }
}

/**
 * The same idea for a single tier, which has its own count. A penthouse
 * another group holds reads "Booked": it is taken, not sold out, and a friend
 * with the group's code can still join it.
 */
export function tierAvailabilityLabel(spotsLeft: number | null, claimed = false): string | null {
  if (claimed) return "Booked";
  if (spotsLeft === null) return null;
  if (spotsLeft <= 0) return "Sold out";
  if (spotsLeft <= 6) return "Few places left";
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
