import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

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
 *   values ('WIN500' || <five random letters and digits>, 500, 'Giveaway winner, Sep 2026');
 *
 * Always with a random part: a code someone could guess from the giveaway
 * itself (the trip plus the amount) is used by whoever guesses it first. The
 * database holds single-use codes to 8+ characters for that reason.
 *
 * A shared code (max_uses above 1, meant to be passed round a group) is the
 * exception: it can be a plain word as short as 3 characters, because it is
 * handed out by design and its length protects nothing
 * (shared_discount_codes migration). Give it an expires_at, for example:
 *
 *   insert into discount_codes (code, amount, max_uses, note, expires_at)
 *   values ('PHIDELT', 100, 1000, 'Phi Delt chapter code',
 *           timestamptz '2026-10-04 00:00 America/Chicago');
 *
 * The discounted figure becomes bookings.total_amount (createBooking), the same
 * way the pay-in-full discount does, so nothing downstream needs to know.
 *
 * A code can also take a share of the price instead of an amount, work on one
 * package only, and be used once per person (free_package_codes migration).
 * A code that takes everything off leaves nothing for Stripe: createBooking
 * makes no card form, and the payment step confirms the booking with the terms
 * alone (confirmFreeBooking). For example, the whole of Four to a Room for two
 * different people:
 *
 *   insert into discount_codes (code, percent_off, tier_name, max_uses, once_per_person, note)
 *   values ('ELLISCOMPUSC', 100, 'BASE', 2, true, 'Comp, Four to a Room, two people');
 */

/**
 * The code as the database stores it: upper case, letters and digits only, so
 * "win500-ab12c " and "WIN500AB12C" are the same code. Null when nothing
 * usable was given. Anything too short or long simply fails the lookup.
 */
export function normalizeDiscountCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  return code.length > 0 ? code : null;
}

/**
 * What the code takes off right now, or null if it cannot be used (unknown,
 * switched off, expired, used up, or already used by this person when it is
 * once per person). For showing prices; claimDiscountCode is what decides. The
 * traveler's own abandoned checkout does not count against them (see
 * discount_code_uses).
 *
 * With a package (tierId), what it takes off that package, and null when the
 * code is for another one. Without one, a percent or one-package code has no
 * single figure and reads as null; the callers that leave it out only ask
 * whether a $100 offer code is still live.
 */
export async function discountCodeAmount(
  admin: Admin,
  code: string,
  userId?: string,
  tierId?: string,
): Promise<number | null> {
  const { data, error } = await admin.rpc("discount_code_amount", { p_code: code, p_user: userId, p_tier: tierId });
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

export type FreeConfirmation = { ok: true; confirmed: boolean } | { ok: false; reason: "used" | "invalid" };

/**
 * Moves a pending $0 booking to paid_in_full, checking its code once more
 * under the code's lock. `confirmed` is false when it already was (a second
 * press). "used" means the code went to others, or to this person on another
 * booking, after it was claimed; "invalid" covers a code switched off or
 * expired since, and a booking that is not a pending $0 one. See
 * confirm_free_booking.
 */
export async function confirmFreeBookingRow(admin: Admin, bookingId: string): Promise<FreeConfirmation> {
  const { data, error } = await admin.rpc("confirm_free_booking", { p_booking: bookingId });
  if (error) {
    if (error.message.includes("discount_code_used")) return { ok: false, reason: "used" };
    if (!error.message.includes("discount_code_invalid") && !error.message.includes("free_booking_invalid")) {
      console.error(`confirmFreeBookingRow(${bookingId}): ${error.code} ${error.message}`);
    }
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, confirmed: data === true };
}

/** Takes any code off a booking that is being re-priced without one. */
export async function dropDiscountCode(admin: Admin, bookingId: string) {
  const { error } = await admin.from("discount_redemptions").delete().eq("booking_id", bookingId);
  if (error) console.error(`dropDiscountCode(${bookingId}) failed: ${error.code} ${error.message}`);
}
