import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  CLAIM_PENDING_WINDOW_MS,
  penthouseFill,
  toSnapshot,
  type PenthouseFill,
  type PenthouseSnapshot,
} from "@/lib/penthouse";

/**
 * Who holds a group-exclusive tier (a penthouse).
 *
 * The rule, and the thing that actually enforces it, is the
 * check_tier_capacity trigger (add_group_exclusive_tiers migration). This
 * module reads the same definition so the site can say "Booked" before anyone
 * tries, and so createBooking can refuse with a clean message ahead of the
 * insert. It is a courtesy, not the control: two groups racing both pass a
 * read here, and the trigger, holding the per-tier lock, lets only one in.
 *
 * An ACTIVE CLAIM is a booking on the tier that is deposit_paid or
 * paid_in_full, or pending and created within CLAIM_PENDING_WINDOW_MS. The
 * claim belongs to the group_code of the earliest such booking. Keep all three
 * parts in step with the trigger.
 *
 * The claim's code is a secret: knowing it is what lets someone into the
 * penthouse. Nothing here returns it to a caller that renders for the public;
 * getTierClaims is for server code that needs to compare, and for the admin.
 */

export { CLAIM_PENDING_WINDOW_MS };

export type TierClaim = {
  /** The claiming group's code. null only for a legacy row written without one. */
  code: string | null;
  /** Active bookings on the tier carrying the claim's code. */
  holders: number;
  /** Active bookings on the tier under any OTHER code. Should be 0; see the admin. */
  others: number;
};

type Admin = SupabaseClient<Database>;

/**
 * The active claim on each of the given tiers, keyed by tier id. A tier with no
 * active booking has no entry. Pass only group-exclusive tier ids; the rule
 * means nothing for the others.
 */
export async function getTierClaims(admin: Admin, tierIds: string[]): Promise<Map<string, TierClaim>> {
  const claims = new Map<string, TierClaim>();
  if (tierIds.length === 0) return claims;

  // created_at is a timestamp without time zone written in UTC; the ISO string
  // compares the same way findOpenCheckout's window does in bookings/actions.ts.
  const since = new Date(Date.now() - CLAIM_PENDING_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from("bookings")
    .select("tier_id, group_code")
    .in("tier_id", tierIds)
    .or(`status.in.(deposit_paid,paid_in_full),and(status.eq.pending,created_at.gt.${since})`)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    // Reads as unclaimed. The trigger still refuses a second group, so the
    // worst case is a traveler finding out at submit rather than on the page.
    console.error(`Failed to read tier claims: ${error.code} — ${error.message}`);
    return claims;
  }

  for (const row of data ?? []) {
    const claim = claims.get(row.tier_id);
    if (!claim) {
      claims.set(row.tier_id, { code: row.group_code, holders: 1, others: 0 });
    } else if (claim.code !== null && row.group_code === claim.code) {
      claim.holders += 1;
    } else {
      claim.others += 1;
    }
  }
  return claims;
}

/** Group codes are typed by hand; compare them the way resolveGroupCode stores them. */
export function normalizeGroupCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? "").trim().toUpperCase();
  return trimmed === "" ? null : trimmed;
}

/** True when `code` is the code holding this claim. A null on either side never matches. */
export function claimMatches(claim: TierClaim | undefined, code: string | null | undefined): boolean {
  const wanted = normalizeGroupCode(code);
  return Boolean(claim && claim.code !== null && wanted !== null && claim.code === wanted);
}

/**
 * The fill progress of the group holding this penthouse, but only for someone
 * who has that group's code: null for a wrong code, an unheld tier, or a tier
 * that is not group-exclusive. This is the gate /api/penthouse-progress and
 * the joining view sit behind, so counts never reach anyone without the code.
 */
export async function getClaimSnapshot(
  admin: Admin,
  tierId: string,
  code: string | null | undefined,
): Promise<PenthouseSnapshot | null> {
  const wanted = normalizeGroupCode(code);
  if (!wanted) return null;
  const { data: tier } = await admin.from("tiers").select("group_exclusive").eq("id", tierId).maybeSingle();
  if (!tier?.group_exclusive) return null;
  const claim = (await getTierClaims(admin, [tierId])).get(tierId);
  if (!claimMatches(claim, wanted)) return null;
  const fill = (await getPenthouseProgress(admin, [{ id: tierId, tier_id: tierId, group_code: wanted }])).get(tierId);
  return fill ? toSnapshot(fill) : null;
}

/**
 * Fill progress for the traveler's own penthouse bookings, keyed by booking
 * id. Bookings on other tiers, or with no group code, get no entry.
 *
 * Counts the group's places across every booking on the tier, which the
 * traveler's own session cannot read (RLS shows them their own rows), so this
 * uses the service role and returns counts and dates only: never another
 * traveler's row.
 */
export async function getPenthouseProgress(
  admin: Admin,
  bookings: { id: string; tier_id: string; group_code: string | null }[],
): Promise<Map<string, PenthouseFill>> {
  const progress = new Map<string, PenthouseFill>();
  const withCode = bookings.filter((b) => b.group_code);
  if (withCode.length === 0) return progress;

  const tierIds = [...new Set(withCode.map((b) => b.tier_id))];
  const { data: tiers } = await admin
    .from("tiers")
    .select("id, max_capacity")
    .in("id", tierIds)
    .eq("group_exclusive", true);
  if (!tiers || tiers.length === 0) return progress;

  const capacity = new Map(tiers.map((t) => [t.id, t.max_capacity]));
  const codes = [...new Set(withCode.filter((b) => capacity.has(b.tier_id)).map((b) => b.group_code!))];
  const { data: rows, error } = await admin
    .from("bookings")
    .select("tier_id, status, group_code, created_at, payments(paid_at, scheduled_date)")
    .in("tier_id", [...capacity.keys()])
    .in("group_code", codes)
    .in("status", ["deposit_paid", "paid_in_full"]);
  if (error) {
    console.error(`Failed to read penthouse progress: ${error.code} — ${error.message}`);
    return progress;
  }

  for (const booking of withCode) {
    const cap = capacity.get(booking.tier_id);
    // An uncapped exclusive tier has nothing to fill; the penthouses are 8.
    if (cap === undefined || cap === null) continue;
    const onTier = (rows ?? []).filter((r) => r.tier_id === booking.tier_id);
    progress.set(booking.id, penthouseFill(onTier, booking.group_code!, cap));
  }
  return progress;
}
