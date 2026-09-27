import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { releasePendingCheckout } from "@/lib/stale-checkout";

type Admin = SupabaseClient<Database>;

/*
 * -- Discount codes ------------------------------------------------------------
 *
 * A fixed amount off one booking, for giveaway prizes. The rules live in the
 * database (discount_codes migration) so they hold however a checkout arrives:
 *
 *   - single use unless the code's max_uses says otherwise;
 *   - "used" means on a booking that is alive, or that has ever taken money,
 *     so an abandoned checkout frees the code and a paid-then-cancelled one
 *     does not;
 *   - claiming locks the code, so two checkouts cannot both take the last use.
 *
 * Codes are made by the team in SQL, for example:
 *
 *   insert into discount_codes (code, amount, note)
 *   values ('TELLURIDE500', 500, 'Giveaway winner, Sep 2026');
 *
 * The discounted figure becomes bookings.total_amount (createBooking), the same
 * way the pay-in-full discount does, so nothing downstream needs to know.
 */

/**
 * The code as the database stores it: upper case, letters and digits only, so
 * "telluride-500 " and "TELLURIDE500" are the same code. Null when nothing
 * usable was given. Anything too short or long simply fails the lookup.
 */
export function normalizeDiscountCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  return code.length > 0 ? code : null;
}

/**
 * What the code takes off right now, or null if it cannot be used (unknown,
 * switched off, expired, used up). For showing prices; claimDiscountCode is
 * what decides. The traveler's own abandoned checkout does not count against
 * them (see discount_code_uses).
 */
export async function discountCodeAmount(admin: Admin, code: string, userId?: string): Promise<number | null> {
  const { data, error } = await admin.rpc("discount_code_amount", { p_code: code, p_user: userId });
  if (error) {
    console.error(`discountCodeAmount: lookup failed: ${error.code} ${error.message}`);
    return null;
  }
  return data === null || data === undefined ? null : Number(data);
}

export type DiscountClaim = { ok: true; amount: number } | { ok: false; reason: "used" | "invalid" };

/** Puts the code on the booking, race-safely. See claim_discount_code. */
export async function claimDiscountCode(admin: Admin, code: string, bookingId: string): Promise<DiscountClaim> {
  const { data, error } = await admin.rpc("claim_discount_code", { p_code: code, p_booking: bookingId });
  if (error) {
    if (error.message.includes("discount_code_used")) return { ok: false, reason: "used" };
    if (!error.message.includes("discount_code_invalid")) {
      console.error(`claimDiscountCode: claim failed: ${error.code} ${error.message}`);
    }
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, amount: Number(data) };
}

/** Takes any code off a booking that is being re-priced without one. */
export async function dropDiscountCode(admin: Admin, bookingId: string) {
  const { error } = await admin.from("discount_redemptions").delete().eq("booking_id", bookingId);
  if (error) console.error(`dropDiscountCode(${bookingId}) failed: ${error.code} ${error.message}`);
}

/**
 * Lets go of the traveler's own unpaid checkouts, on other packages, that are
 * holding this code: someone who opened checkout with it, walked away and came
 * back to book a different package. The same package is left alone, because
 * createBooking already carries on or releases those itself. False if one of
 * them has a payment moving and could not be released.
 */
export async function releaseOwnCodeHolds(admin: Admin, userId: string, code: string, tierId: string): Promise<boolean> {
  const { data: holds } = await admin
    .from("discount_redemptions")
    .select("booking_id, bookings!inner(user_id, status, tier_id)")
    .eq("code", code)
    .eq("bookings.user_id", userId)
    .eq("bookings.status", "pending")
    .neq("bookings.tier_id", tierId);
  for (const hold of holds ?? []) {
    if (!(await releasePendingCheckout(admin, hold.booking_id))) return false;
  }
  return true;
}
