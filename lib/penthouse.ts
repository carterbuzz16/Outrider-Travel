/**
 * The penthouse rules, in one place.
 *
 * A penthouse is a group-exclusive tier (tiers.group_exclusive): one friend
 * group buys it out. Who holds one is lib/tier-claims.ts and, as the actual
 * control, the check_tier_capacity trigger. This file is the rest: the words
 * the traveler agrees to, and the 7-day fill window.
 *
 * Pure and client-safe (no database access), so pages, the admin and any
 * client component can share it.
 */

/**
 * Shown on the penthouse package at checkout and beside the pay button when
 * the booking is a penthouse. One constant so the Terms can quote it word for
 * word later; change it here and nowhere else.
 */
export const PENTHOUSE_DISCLAIMER =
  "A penthouse is booked by the whole group. Once the first place is booked, your group has 7 days to fill all eight. If any places are still empty after that, the group owes the difference for them, and our team will work out the details with you.";

/** Days a group has to fill its penthouse, from its first spot-holding booking. */
export const PENTHOUSE_FILL_DAYS = 7;

/**
 * How long a pending (mid-checkout) booking holds a penthouse for its group,
 * and its bed in any capped tier. Must match both INTERVALs in the
 * check_tier_capacity trigger (capacity_counts_live_bookings migration).
 */
export const CLAIM_PENDING_WINDOW_MS = 30 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * bookings.created_at and payments.paid_at are TIMESTAMP without time zone,
 * written in UTC, and PostgREST returns them with no offset. `new Date()` on
 * such a string reads it as local time, which is hours off anywhere but UTC.
 */
export function parseDbTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A booking row as the fill window needs it. */
export type FillRow = {
  status: string;
  group_code: string | null;
  created_at: string;
  payments?: { paid_at: string | null; scheduled_date: string | null }[] | null;
};

const SPOT_HOLDING = new Set(["deposit_paid", "paid_in_full"]);

/**
 * When a spot-holding booking started holding: its checkout payment's paid_at
 * (the payment with no scheduled_date), or created_at when that is missing.
 */
function heldSince(row: FillRow): Date | null {
  const paid = (row.payments ?? [])
    .filter((p) => p.scheduled_date === null && p.paid_at)
    .map((p) => parseDbTimestamp(p.paid_at))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return paid ?? parseDbTimestamp(row.created_at);
}

export type PenthouseFill = {
  /** Spot-holding bookings (deposit or more paid) carrying the group's code. */
  filled: number;
  capacity: number;
  /** When the 7 days end. null until the first place is paid for. */
  deadline: Date | null;
  /** Whole days left, rounded up; 0 once the deadline has passed. */
  daysLeft: number;
  /**
   * waiting: nobody has paid yet, so the clock has not started.
   * filling: inside the 7 days with places empty.
   * full: every place taken.
   * expired: the 7 days are up with places still empty.
   */
  state: "waiting" | "filling" | "full" | "expired";
};

/**
 * One group's progress through its penthouse, from that tier's bookings.
 * Only rows with the group's code count, and only once something is paid on
 * them; a pending checkout is not a place taken.
 */
export function penthouseFill(
  rows: FillRow[],
  groupCode: string,
  capacity: number,
  now: Date = new Date(),
): PenthouseFill {
  const held = rows.filter((r) => r.group_code === groupCode && SPOT_HOLDING.has(r.status));
  const filled = held.length;
  const start = held
    .map(heldSince)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (filled >= capacity) {
    return { filled, capacity, deadline: start ? addDays(start) : null, daysLeft: 0, state: "full" };
  }
  if (!start) {
    return { filled, capacity, deadline: null, daysLeft: PENTHOUSE_FILL_DAYS, state: "waiting" };
  }
  const deadline = addDays(start);
  const msLeft = deadline.getTime() - now.getTime();
  if (msLeft <= 0) return { filled, capacity, deadline, daysLeft: 0, state: "expired" };
  return { filled, capacity, deadline, daysLeft: Math.ceil(msLeft / DAY_MS), state: "filling" };
}

/**
 * What the progress panel needs, in a shape that crosses to the browser (and
 * that /api/penthouse-progress returns): the counts and the deadline, nothing
 * about who. The panel works out "days left" from the deadline itself, so a
 * page left open keeps counting down between polls.
 */
export type PenthouseSnapshot = {
  filled: number;
  capacity: number;
  /** ISO timestamp, or null until the first place is paid for. */
  deadline: string | null;
  full: boolean;
};

export function toSnapshot(fill: PenthouseFill): PenthouseSnapshot {
  return {
    filled: fill.filled,
    capacity: fill.capacity,
    deadline: fill.deadline ? fill.deadline.toISOString() : null,
    full: fill.state === "full",
  };
}

/** A snapshot read against the clock: the same states penthouseFill gives. */
export function readSnapshot(
  snapshot: PenthouseSnapshot,
  now: Date = new Date(),
): Pick<PenthouseFill, "state" | "daysLeft"> {
  if (snapshot.full) return { state: "full", daysLeft: 0 };
  const deadline = snapshot.deadline ? new Date(snapshot.deadline) : null;
  if (!deadline) return { state: "waiting", daysLeft: PENTHOUSE_FILL_DAYS };
  const msLeft = deadline.getTime() - now.getTime();
  if (msLeft <= 0) return { state: "expired", daysLeft: 0 };
  return { state: "filling", daysLeft: Math.ceil(msLeft / DAY_MS) };
}

function addDays(date: Date): Date {
  return new Date(date.getTime() + PENTHOUSE_FILL_DAYS * DAY_MS);
}

/** A booking row as the claim rule needs it. */
export type ClaimRow = FillRow & { id: string };

/**
 * Who holds a penthouse, from all of its bookings, by the same rule as the
 * trigger: the earliest (created_at, then id) booking that is paid for, or
 * pending and under CLAIM_PENDING_WINDOW_MS old. null when nobody does.
 * `others` counts active bookings under any other code, which the trigger
 * should never let happen; the admin shows it if it ever does.
 */
export function claimFromRows(
  rows: ClaimRow[],
  now: Date = new Date(),
): { code: string | null; others: number } | null {
  const cutoff = now.getTime() - CLAIM_PENDING_WINDOW_MS;
  const active = rows
    .filter((r) => {
      if (SPOT_HOLDING.has(r.status)) return true;
      const created = parseDbTimestamp(r.created_at);
      return r.status === "pending" && created !== null && created.getTime() > cutoff;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  if (active.length === 0) return null;
  const code = active[0].group_code;
  return { code, others: active.filter((r) => code === null || r.group_code !== code).length - (code === null ? 1 : 0) };
}

/** The invite a group sends round: straight to the package, code filled in. */
export function penthouseInvitePath(tripId: string, tierId: string, groupCode: string): string {
  return `/bookings/new?trip=${encodeURIComponent(tripId)}&package=${encodeURIComponent(tierId)}&group=${encodeURIComponent(groupCode)}`;
}
