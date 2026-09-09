"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Cancels a booking and stops any money still scheduled against it.
 *
 * Cancel rather than delete: a booking is the record of something that
 * happened, and deleting one that has taken a payment would leave a Stripe
 * charge with nothing in the database explaining it. Cancelled bookings stop
 * counting toward a departure's capacity, which is the practical effect the
 * back office wants.
 *
 * Scheduled payments are cancelled in the same breath. Leaving them behind is
 * how a cancelled traveler gets charged an installment a month later.
 */
export async function cancelBookingAsAdmin(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("booking_id") ?? "");
  if (!bookingId) redirect("/admin?error=Missing booking.");

  const admin = createAdminClient();

  const { error: paymentError } = await admin
    .from("payments")
    .update({ status: "canceled" })
    .eq("booking_id", bookingId)
    .in("status", ["scheduled", "pending", "requires_action"]);

  if (paymentError) {
    console.error(`Admin cancel: failed to stop payments for ${bookingId}:`, paymentError);
    redirect(`/admin?error=${encodeURIComponent("Could not stop the scheduled payments. Nothing was changed.")}`);
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    console.error(`Admin cancel: failed to cancel booking ${bookingId}:`, error);
    redirect(`/admin?error=${encodeURIComponent("Could not cancel that booking.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/trips");
  redirect("/admin?message=Booking cancelled and future payments stopped.");
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
  if (!bookingId) redirect("/admin?error=Missing booking.");

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) redirect("/admin?error=That booking no longer exists.");

  if (booking.status !== "pending") {
    redirect(
      `/admin?error=${encodeURIComponent("That booking has taken a payment, so it can only be cancelled, not deleted.")}`,
    );
  }

  // Payment rows are created alongside the booking and reference it, so they
  // go first or the delete is refused by the foreign key.
  await admin.from("payments").delete().eq("booking_id", bookingId);
  await admin.from("legal_acceptances").delete().eq("booking_id", bookingId);

  const { error } = await admin.from("bookings").delete().eq("id", bookingId);

  if (error) {
    console.error(`Admin delete: failed to remove booking ${bookingId}:`, error);
    redirect(`/admin?error=${encodeURIComponent("Could not delete that booking.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/trips");
  redirect("/admin?message=Unpaid booking removed.");
}
