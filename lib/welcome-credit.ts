import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Admin = SupabaseClient<Database>;

/*
 * -- The new-account credit ------------------------------------------------------
 *
 * Every account gets WELCOME_CREDIT off one trip, for the first
 * WELCOME_CREDIT_HOURS after it is made. The owner's call (29 September 2026),
 * so a visitor who arrives from an Instagram ad has a reason to book now: the
 * /telluride pop-up offers it, and checkout applies it without a code.
 *
 * Nothing is stored for the credit itself. It is live while both hold:
 *
 *   - the account is less than WELCOME_CREDIT_HOURS old (auth.users.created_at,
 *     which for a code sign-in is when the first code was sent);
 *   - none of the account's bookings has spent it. A booking carries the
 *     credit it was given in bookings.credit_amount (new_account_credit
 *     migration), and it counts as spent once money has moved on that booking,
 *     the same rule discount codes use: an abandoned checkout gives it back, a
 *     paid-then-cancelled one does not.
 *
 * The 24 hours are real, because the pop-up says so. A checkout started inside
 * them is charged at the credited price while its 30-minute hold lasts; one
 * that sits past its hold and comes back after the credit has run out is let
 * go and chosen again (recheckStaleCheckout), or the window would stretch to
 * however long a checkout was left open.
 *
 * It combines with the pay-in-full discount and nothing else (Carter, 29
 * September 2026), so the most the two take off together is $200. With a
 * discount code as well, only one of the two applies: see creditOrCode. What
 * applies comes off bookings.total_amount in createBooking, so nothing
 * downstream needs to know. One account books one traveler, so this is one
 * credit per traveler.
 *
 * A read error answers "no credit", as a failed discount lookup does: the
 * traveler sees the full price rather than a figure that might not hold.
 *
 * Ended for new accounts on 5 October 2026 (WELCOME_CREDIT_ENDS).
 */

export const WELCOME_CREDIT = 100;
export const WELCOME_CREDIT_HOURS = 24;

/**
 * Accounts made from this moment on get no credit (Carter, 5 October 2026).
 * $100 off is now for chapter members, through their chapter's own code, and
 * a credit every new account got would hand anyone the same $100 at checkout
 * with no code at all. An account made before it keeps its 24 hours, since
 * checkout promised them; no real account had one running when this was set.
 */
export const WELCOME_CREDIT_ENDS = Date.parse("2026-10-05T16:00:00Z");

/** Whether an account made now would get the credit, which is what checkout's "New here?" note promises. */
export function welcomeCreditOpen(now: number = Date.now()): boolean {
  return now < WELCOME_CREDIT_ENDS;
}

export type WelcomeCredit = { amount: number; expiresAt: string };

/**
 * The credit and a discount code do not combine. With both, the bigger one
 * comes off and the other is set aside; on a tie the code, since it was typed
 * on purpose. A code set aside is never claimed, so it is not used up. The
 * booking page and createBooking both decide with this, so the figures shown
 * are the figures charged.
 */
export function creditOrCode(code: number, credit: number): { code: number; credit: number } {
  if (code > 0 && credit > 0) return code >= credit ? { code, credit: 0 } : { code: 0, credit };
  return { code, credit };
}

/** When an account's credit runs out, or null for a timestamp that does not parse. */
export function welcomeCreditExpiry(accountCreatedAt: string | null | undefined): Date | null {
  if (!accountCreatedAt) return null;
  const created = Date.parse(accountCreatedAt);
  return Number.isFinite(created) ? new Date(created + WELCOME_CREDIT_HOURS * 60 * 60 * 1000) : null;
}

/**
 * The credit this account can use right now, or null. `exclude` leaves one
 * booking out of the "spent" check, so a checkout carrying the credit can ask
 * whether it is still its own.
 */
export async function welcomeCreditFor(
  admin: Admin,
  user: { id: string; created_at?: string | null },
  { exclude, now = Date.now() }: { exclude?: string; now?: number } = {},
): Promise<WelcomeCredit | null> {
  // Made on or after the end, or a timestamp that does not parse: no credit.
  if (!(Date.parse(user.created_at ?? "") < WELCOME_CREDIT_ENDS)) return null;
  const expiresAt = welcomeCreditExpiry(user.created_at);
  if (!expiresAt || expiresAt.getTime() <= now) return null;
  if (await creditSpent(admin, user.id, exclude)) return null;
  return { amount: WELCOME_CREDIT, expiresAt: expiresAt.toISOString() };
}

/** Whether any of this account's bookings, other than `exclude`, has spent the credit. */
async function creditSpent(admin: Admin, userId: string, exclude?: string): Promise<boolean> {
  const { data, error } = await admin
    .from("bookings")
    .select("id, status, payments(status)")
    .eq("user_id", userId)
    .gt("credit_amount", 0);
  if (error) {
    console.error(`welcomeCredit: spent check failed for ${userId}: ${error.code} ${error.message}`);
    return true;
  }
  return (data ?? []).some(
    (booking) =>
      booking.id !== exclude &&
      (booking.status === "deposit_paid" ||
        booking.status === "paid_in_full" ||
        booking.payments.some((p) => p.status === "succeeded" || p.status === "refunded")),
  );
}

/**
 * The credit a booking was given, or 0. Read on its own so a page that shows
 * it never fails over it: an error here only drops the line.
 */
export async function bookingCredit(admin: Admin, bookingId: string): Promise<number> {
  const { data, error } = await admin.from("bookings").select("credit_amount").eq("id", bookingId).maybeSingle();
  if (error || !data) return 0;
  return Number(data.credit_amount) || 0;
}
