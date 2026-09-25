"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isBookingId } from "@/lib/portal-token";
import { parseIdentity } from "@/lib/traveler-details";
import type { PortalActionResult } from "@/app/trip/[bookingId]/fields";

/*
 * The identity half of traveler details, saved from checkout's "Your details"
 * step, between choosing a package and paying.
 *
 * This is the same traveler_details row the trip portal writes, filled in
 * from the other end: legal name, date of birth, school, phone and an
 * emergency contact. It is asked before the card, not after, so that nobody
 * is charged for a place without the team knowing who is taking it, and so
 * the Terms ticked on the payment step belong to a named person. See
 * lib/traveler-details.ts for why it is split.
 *
 * AUTHORIZATION IS THE SESSION, NOT A TOKEN. The portal's actions have no
 * Supabase user to check, so they verify a signed link. Here there is a real
 * signed-in user, so the booking is read back through the user-scoped client
 * and RLS ("Users can view own bookings") is what proves it is theirs. The id
 * arriving in the form is never trusted for anything else.
 *
 * The WRITE still goes through the service-role client: traveler_details has
 * RLS on with no policies and its privileges revoked from `authenticated`
 * (the add_post_booking_forms migration), and none of that is being relaxed
 * for this page.
 *
 * Logging: booking ids and database error codes only, never the row. This
 * table holds a legal name, a date of birth and two phone numbers, and a
 * console.error carrying them would copy them into Vercel's logs, which have
 * none of the table's protection.
 */

/*
 * Pending is the checkout itself. The paid statuses stay open so a traveler
 * who comes back through this page to fix a typo still can; a cancelled
 * booking is not going.
 */
const OPEN_STATUSES = ["pending", "deposit_paid", "paid_in_full"] as const;

export async function saveIdentityDetails(
  _prev: PortalActionResult | null,
  formData: FormData,
): Promise<PortalActionResult> {
  const bookingId = String(formData.get("bookingId") ?? "").toLowerCase();
  if (!isBookingId(bookingId)) {
    return { ok: false, message: "That didn't save. Reload the page and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session expired. Sign in again to save this." };
  }

  // Per user, not per booking: the session is the credential here, so this is
  // what bounds one account hammering the table. Generous, since somebody
  // fixing a typo a few times should never see it.
  if (!(await checkRateLimit(`identity:write:${user.id}`, 30, 60 * 60))) {
    return { ok: false, message: "Too many changes in a short time. Try again in an hour." };
  }

  // RLS scopes this to the signed-in user, so a booking that comes back is
  // theirs by construction. No row means not theirs, or not a booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { ok: false, message: "That didn't save. Reload the page and try again." };
  }
  if (!(OPEN_STATUSES as readonly string[]).includes(booking.status)) {
    return { ok: false, message: "This booking isn't open for details." };
  }

  const parsed = parseIdentity(formData);
  if (!parsed.ok) {
    return { ok: false, message: "A few things need another look.", fieldErrors: parsed.fieldErrors };
  }

  /*
   * Only the identity columns are named, so a traveler who already sent the
   * gear half from the portal and then comes back to fix a name keeps their
   * sizes. submitted_at is pinned to the first write by the table's
   * keep_first_submitted_at trigger, whatever is sent here.
   */
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("traveler_details")
    .upsert({ booking_id: booking.id, ...parsed.values, updated_at: now }, { onConflict: "booking_id" });

  if (error) {
    // Code and message only: `details` would carry the row.
    console.error(`saveIdentityDetails(${booking.id}) failed: ${error.code} ${error.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }

  /*
   * bookings.details_submitted is deliberately NOT set here. It means the
   * whole task is done, and the gear half is still outstanding; setting it
   * would tick the trip page's third task and stop the 72-hour chase for
   * someone the rental shop knows nothing about.
   */
  // Mid-checkout, the next thing is the card. redirect() throws, so it stays
  // outside anything that would catch it.
  if (booking.status === "pending") {
    redirect(`/bookings/${booking.id}/pay`);
  }
  revalidatePath(`/bookings/${booking.id}/details`);
  return { ok: true };
}
