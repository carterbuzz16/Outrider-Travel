"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelOpenIntent } from "@/lib/stripe-intents";
import { isBookingId } from "@/lib/portal-token";

/*
 * Booking actions for the back office.
 *
 * Server actions are POST endpoints callable directly, whether or not the page
 * that renders the button was ever loaded, so the role check is repeated here
 * rather than relying on app/admin/layout.tsx. Same reasoning as
 * app/admin/trips/actions.ts.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/bookings");
}

/** Where a booking action reports back: its own page, which shows ?message and ?error. */
function detailPath(bookingId: string, query: string): string {
  return `/admin/bookings/${bookingId}?${query}`;
}

/**
 * Cancels every card form still open on a booking at Stripe, and marks its
 * row. The same thing the traveler's own cancel does (cancelBooking in
 * app/(protected)/bookings/actions.ts): an open deposit form, an early payment
 * or an installment waiting on the bank must not be able to take money for a
 * booking the back office has ended. Returns false if any of them is already
 * moving money; that row is left for the webhook to settle, and
 * lib/overpayment.ts logs it for review.
 */
async function stopOpenIntents(admin: ReturnType<typeof createAdminClient>, bookingId: string): Promise<boolean> {
  const { data: open } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "requires_action"])
    .not("stripe_payment_intent_id", "is", null);

  const results = await Promise.all(
    (open ?? []).map(async (row) => {
      if (await cancelOpenIntent(row.stripe_payment_intent_id!)) {
        await admin
          .from("payments")
          .update({ status: "canceled" })
          .eq("id", row.id)
          .in("status", ["pending", "requires_action"]);
        return true;
      }
      console.error(`Admin: could not stop ${row.stripe_payment_intent_id} on booking ${bookingId}`);
      return false;
    }),
  );
  return results.every(Boolean);
}

/**
 * Cancels a booking and stops any money still scheduled against it.
 *
 * Cancel rather than delete: a booking is the record of something that
 * happened, and deleting one that has taken a payment would leave a Stripe
 * charge with nothing in the database explaining it. Cancelled bookings stop
 * counting toward a departure's capacity, which is the practical effect the
 * back office wants.
 *
 * The scheduled payments are stopped before the status changes, so a failure
 * there leaves the booking exactly as it was, and again after, for a deposit
 * webhook scheduling at this same moment: scheduleInstallments writes its rows
 * and then reads the status, so whichever of the two goes second sees the
 * other (the same reasoning as the traveler's own cancel). Then the open card
 * forms at Stripe. Leaving scheduled payments behind is how a cancelled
 * traveler gets charged an installment a month later; leaving an intent open
 * is how they pay a deposit on nothing.
 */
export async function cancelBookingAsAdmin(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("booking_id") ?? "");
  if (!isBookingId(bookingId)) redirect("/admin?error=missing_booking");

  const admin = createAdminClient();
  const stopScheduled = () =>
    admin.from("payments").update({ status: "canceled" }).eq("booking_id", bookingId).eq("status", "scheduled");

  const { error: paymentError } = await stopScheduled();
  if (paymentError) {
    console.error(`Admin cancel: failed to stop payments for ${bookingId}:`, paymentError);
    redirect(detailPath(bookingId, "error=stop_payments_failed"));
  }

  const { error } = await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (error) {
    console.error(`Admin cancel: failed to cancel booking ${bookingId}:`, error);
    redirect(detailPath(bookingId, "error=cancel_failed"));
  }

  const { error: sweepError } = await stopScheduled();
  if (sweepError) {
    console.error(`Admin cancel: second sweep of scheduled payments failed for ${bookingId}:`, sweepError);
  }

  const stopped = await stopOpenIntents(admin, bookingId);

  revalidatePath("/admin");
  revalidatePath("/admin/trips");
  revalidatePath(`/admin/bookings/${bookingId}`);
  redirect(detailPath(bookingId, stopped ? "message=booking_cancelled" : "error=cancelled_payment_moving"));
}

/**
 * Permanently removes a booking that never took money.
 *
 * Only ever allowed while the booking is `pending`, which means no deposit was
 * confirmed and no Stripe charge succeeded against it. Anything further along
 * gets cancelled instead, so the financial record survives.
 */
export async function deletePendingBooking(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("booking_id") ?? "");
  if (!isBookingId(bookingId)) redirect("/admin?error=missing_booking");

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) redirect("/admin?error=booking_gone");

  if (booking.status !== "pending") {
    redirect(detailPath(bookingId, "error=has_payment"));
  }

  // Its card form first: a deleted booking whose deposit form still works is a
  // charge with no row explaining it. One already moving money means this is
  // not an unpaid booking after all, so it stays.
  if (!(await stopOpenIntents(admin, bookingId))) {
    redirect(detailPath(bookingId, "error=delete_payment_moving"));
  }

  // Payment rows are created alongside the booking and reference it, so they
  // go first or the delete is refused by the foreign key. Never a succeeded or
  // refunded row: if one landed in the meantime, it survives, the foreign key
  // refuses the delete below, and the booking is kept with its record.
  await admin.from("payments").delete().eq("booking_id", bookingId).in("status", ["pending", "canceled", "failed", "scheduled"]);
  await admin.from("legal_acceptances").delete().eq("booking_id", bookingId);

  const { error } = await admin.from("bookings").delete().eq("id", bookingId).eq("status", "pending");

  if (error) {
    console.error(`Admin delete: failed to remove booking ${bookingId}:`, error);
    redirect(detailPath(bookingId, "error=delete_failed"));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/trips");
  redirect("/admin?message=booking_removed");
}
