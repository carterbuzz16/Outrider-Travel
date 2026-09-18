import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getStripe } from "@/lib/stripe";
import { CLAIM_PENDING_WINDOW_MS, parseDbTimestamp } from "@/lib/penthouse";
import { activeBookingFilter, claimMatches, getTierClaims } from "@/lib/tier-claims";
import { OPEN_INTENT_STATUSES, POSSIBLY_OPEN_PAYMENT_FILTER } from "@/lib/stripe-intents";
import { CHECKOUT_ERRORS } from "@/lib/flash";

type Admin = SupabaseClient<Database>;

/*
 * -- A checkout that sat past its 30 minutes ------------------------------------
 *
 * A pending booking holds its bed (and, on a penthouse, its group's claim) for
 * CLAIM_PENDING_WINDOW_MS after it is created, and then stops: the
 * check_tier_capacity trigger and every availability read count only paid
 * bookings and fresh pending ones (capacity_counts_live_bookings migration).
 * That is what stops abandoned checkouts holding beds forever.
 *
 * But the stale booking's card form still works. Paid, it would become a place
 * the tier no longer had room for, or a second group inside someone else's
 * penthouse. So before its card is confirmed, a stale pending booking is
 * checked again against the tier as it is now:
 *
 *   - full: the paid and fresh pending bookings on the tier, not counting this
 *     one, already fill max_capacity;
 *   - claimed: the tier is a penthouse held by a different group code.
 *
 * Either way the booking is released: its PaymentIntent cancelled at Stripe
 * first, so the open form cannot take money, then the booking abandoned. A
 * stale booking that still fits goes ahead as normal.
 *
 * Called from the pay page (so the traveler finds out on arrival) and from
 * acceptTermsForBooking, which CheckoutForm calls immediately before it
 * confirms the card (so a page left open past the window is caught at the
 * button). Every write is conditional on the booking still being pending and
 * the intent still being open, so running it twice, or at the same moment as
 * the webhook, does nothing extra.
 *
 * What is left, deliberately:
 *   - The re-check is a read, not a hold. A stale booking that passes it is
 *     not counted by the trigger, so a new checkout can take the same last bed
 *     in the seconds between the check and the card being confirmed, and two
 *     stale checkouts for the last bed can both pass at once. Either way the
 *     tier ends one over, which the admin sees. Closing it fully would mean
 *     re-holding the bed under the trigger's advisory lock (a database
 *     function that re-stamps the booking), which is more machinery than the
 *     odds justify at these capacities.
 *   - A card confirmed without going through CheckoutForm (a script with the
 *     client secret) skips acceptTermsForBooking. The webhook already logs any
 *     payment without a recorded acceptance, which such a confirm also is.
 */

export type StaleCheckoutResult =
  | { ok: true }
  | { ok: false; reason: "full" | "claimed"; tripId: string; tierId: string };

type PendingBooking = {
  id: string;
  status: string;
  trip_id: string;
  tier_id: string;
  group_code: string | null;
  created_at: string;
};

/** True for a pending booking older than the hold window. */
export function isStalePending(booking: Pick<PendingBooking, "status" | "created_at">, now: number = Date.now()): boolean {
  if (booking.status !== "pending") return false;
  const created = parseDbTimestamp(booking.created_at);
  return created !== null && created.getTime() <= now - CLAIM_PENDING_WINDOW_MS;
}

type ConflictBooking = {
  id: string;
  tier_id: string;
  group_code: string | null;
  tiers: { max_capacity: number | null; group_exclusive: boolean } | null;
};

/**
 * Whether the tier still has room for this booking as it stands now, not
 * counting the booking itself: "claimed" when it is a penthouse held by a
 * different group code, "full" when the paid and fresh pending bookings on it
 * already fill max_capacity, null when it fits. Call it only for a booking that
 * is not itself holding anything (past its window): a booking that holds the
 * claim would otherwise find itself.
 *
 * A read error answers null (fits): this is a courtesy check layered over the
 * trigger, and a failed read should not cancel anyone's booking.
 */
export async function staleConflict(admin: Admin, booking: ConflictBooking): Promise<"full" | "claimed" | null> {
  const tier = booking.tiers;

  if (tier?.group_exclusive) {
    // This booking is past the window, so it is not part of any active claim
    // itself: whoever holds the penthouse now, if anyone, is someone else. It
    // may still be its own group (a friend's booking), which is fine.
    const claim = (await getTierClaims(admin, [booking.tier_id])).get(booking.tier_id);
    if (claim && !claimMatches(claim, booking.group_code)) return "claimed";
  }

  if (tier?.max_capacity != null) {
    const { count, error } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tier_id", booking.tier_id)
      .neq("id", booking.id)
      .or(activeBookingFilter());
    if (error) {
      console.error(`staleConflict(${booking.id}): ${error.code} ${error.message}`);
      return null;
    }
    if ((count ?? 0) >= tier.max_capacity) return "full";
  }

  return null;
}

/**
 * Whether a stale pending booking may still be paid, releasing it if not.
 * A booking that is not stale (or not pending) is always ok here. On a read
 * error it answers ok: the trigger was the control before, and a failed read
 * should not cancel someone's checkout.
 */
export async function recheckStaleCheckout(admin: Admin, bookingId: string): Promise<StaleCheckoutResult> {
  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, trip_id, tier_id, group_code, created_at, tiers(max_capacity, group_exclusive)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || !isStalePending(booking)) return { ok: true };

  const reason = await staleConflict(admin, booking);
  if (!reason) return { ok: true };

  // The form must stop working before the booking stops holding anything. If
  // Stripe will not cancel (the card is already going through), the money is
  // moving and the webhook settles it; leave the booking for that.
  // settleCheckoutPayment (lib/payments.ts) runs this same check when the
  // money lands, and refunds it if the place is still gone.
  if (!(await cancelCheckoutIntents(admin, booking.id))) {
    console.error(
      `recheckStaleCheckout: booking ${booking.id} is past its hold and its tier is ${reason}, ` +
        `but its payment is already moving. Left for the webhook, which re-checks on settlement.`,
    );
    return { ok: true };
  }
  await abandonPendingBooking(admin, booking.id);
  return { ok: false, reason, tripId: booking.trip_id, tierId: booking.tier_id };
}

/**
 * Releases a traveler's own pending checkout that is being replaced: its card
 * forms cancelled at Stripe first, then the booking abandoned. False, with
 * nothing released, if a payment on it is already moving money.
 */
export async function releasePendingCheckout(admin: Admin, bookingId: string): Promise<boolean> {
  if (!(await cancelCheckoutIntents(admin, bookingId))) return false;
  await abandonPendingBooking(admin, bookingId);
  return true;
}

/** What the traveler reads when their stale checkout was released. */
export function staleCheckoutMessage(reason: "full" | "claimed"): string {
  return CHECKOUT_ERRORS[staleCheckoutCode(reason)];
}

/** The ?error= code for a released checkout (see lib/flash.ts). */
export function staleCheckoutCode(reason: "full" | "claimed"): "stale_claimed" | "stale_full" {
  return reason === "claimed" ? "stale_claimed" : "stale_full";
}

/** Where "choose again" goes: the booking page for the same trip, with an error code if given. */
export function chooseAgainPath(tripId: string, code?: string): string {
  const query = `trip=${encodeURIComponent(tripId)}` + (code ? `&error=${encodeURIComponent(code)}` : "");
  return `/bookings/new?${query}`;
}

/**
 * Cancels every open checkout intent on the booking and marks its row.
 * True once none of them can take money; false if one is already moving
 * (processing, succeeded) or Stripe could not be reached.
 */
export async function cancelCheckoutIntents(admin: Admin, bookingId: string): Promise<boolean> {
  const { data: rows } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .or(POSSIBLY_OPEN_PAYMENT_FILTER)
    .not("stripe_payment_intent_id", "is", null);

  const stripe = getStripe();
  for (const row of rows ?? []) {
    try {
      const intent = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id!);
      if (intent.status !== "canceled") {
        if (!OPEN_INTENT_STATUSES.includes(intent.status)) return false;
        await stripe.paymentIntents.cancel(intent.id);
      }
    } catch {
      return false;
    }
    await admin
      .from("payments")
      .update({ status: "canceled" })
      .eq("id", row.id)
      .or(POSSIBLY_OPEN_PAYMENT_FILTER);
  }
  return true;
}

/**
 * Undoes a pending booking that will not be paid.
 *
 * Deleted when nothing points at it (createBooking's own failure path, before
 * any payment row or acceptance exists). A delete that fails (a payment row or
 * an acceptance already points at it, and both keep their rows) falls back to
 * cancelling, which frees its place just the same: nothing counts a cancelled
 * booking. Both are conditional on the booking still being pending, so a
 * payment that somehow landed is never undone.
 */
export async function abandonPendingBooking(admin: Admin, bookingId: string) {
  const { error } = await admin.from("bookings").delete().eq("id", bookingId).eq("status", "pending");
  if (!error) return;
  const { error: cancelError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("status", "pending");
  if (cancelError) {
    console.error(`abandonPendingBooking: could not undo pending booking ${bookingId}: ${cancelError.message}`);
  }
}
