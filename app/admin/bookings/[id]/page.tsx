import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { getAcceptances } from "@/lib/legal-acceptance";
import { roomKeyFor } from "@/lib/room-media";
import { confirmationNumber } from "@/lib/confirmation-number";
import { isBookingId } from "@/lib/portal-token";
import { ADMIN_ERRORS, ADMIN_ERROR_FALLBACK, ADMIN_MESSAGES, ADMIN_MESSAGE_FALLBACK, flashText } from "@/lib/flash";
import BookingDetailView, { type DetailBooking, type GroupMember, type PenthouseClaim, type TravelerPii } from "./BookingDetailView";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false, nocache: true },
};

// Per request, never cached: this page can carry a traveler's date of birth
// and emergency contact. A dynamic page is sent `Cache-Control: private,
// no-cache, no-store`, which keeps it out of shared caches and the bfcache.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DETAIL_SELECT =
  "id, user_id, trip_id, tier_id, status, total_amount, deposit_amount, group_code, created_at, flights_booked, rooming_submitted, rooming_submitted_at, details_submitted, sms_consent, sms_consent_at, sms_consent_text_version, confirmation_email_sent_at, chase_email_sent_at, users(email, name), trips(id, name, destination, start_date, end_date), tiers(id, name, max_capacity), payments(id, amount, status, scheduled_date, attempt_count, paid_at, last_attempted_at, stripe_payment_intent_id), rooming_requests(roommate_names, no_preference, submitted_at, updated_at), traveler_details(submitted_at, updated_at)";

// Only ever selected when an admin has asked to see it (?details=show), so it
// is not in the page, or in the RSC payload, otherwise.
const PII_SELECT =
  "legal_name, date_of_birth, phone, emergency_contact_name, emergency_contact_phone, school, ski_or_board, ability_level, height, weight, shoe_size, dietary_restrictions";

/** Whether the Stripe key is a test-mode key. Only the boolean leaves this file, never the key. */
function stripeIsTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

export default async function AdminBookingPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ details?: string; message?: string; error?: string }>;
}) {
  const adminId = await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  if (!isBookingId(id)) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin.from("bookings").select(DETAIL_SELECT).eq("id", id).maybeSingle();
  if (error) {
    console.error(`admin booking ${id}: ${error.code} ${error.message}`);
    throw new Error("Could not load this booking.");
  }
  if (!data) notFound();
  const booking = data as unknown as DetailBooking;

  const [acceptances, group, penthouse, pii] = await Promise.all([
    getAcceptances(id),
    loadGroup(admin, booking),
    loadPenthouseClaim(admin, booking),
    searchParams.details === "show" ? loadPii(admin, booking.id, adminId) : Promise.resolve(null),
  ]);

  return (
    <BookingDetailView
      booking={booking}
      confirmation={confirmationNumber(booking.id)}
      today={new Date().toISOString().slice(0, 10)}
      stripeTestMode={stripeIsTestMode()}
      acceptances={acceptances}
      group={group}
      penthouse={penthouse}
      pii={pii}
      showPii={searchParams.details === "show"}
      message={flashText(ADMIN_MESSAGES, searchParams.message, ADMIN_MESSAGE_FALLBACK)}
      error={flashText(ADMIN_ERRORS, searchParams.error, ADMIN_ERROR_FALLBACK)}
    />
  );
}

type Admin = ReturnType<typeof createAdminClient>;

/** Everyone else on the same trip with the same group code. */
async function loadGroup(admin: Admin, booking: DetailBooking): Promise<GroupMember[]> {
  if (!booking.group_code) return [];
  const { data } = await admin
    .from("bookings")
    .select("id, status, created_at, users(name, email), tiers(name)")
    .eq("trip_id", booking.trip_id)
    .eq("group_code", booking.group_code)
    .neq("id", booking.id)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as GroupMember[];
}

/**
 * How far along a penthouse is. Each penthouse is its own package that one
 * group of eight books whole (lib/room-media.ts), so progress is the spots
 * held on this package against its cap, and which group codes hold them.
 */
async function loadPenthouseClaim(admin: Admin, booking: DetailBooking): Promise<PenthouseClaim | null> {
  if (!booking.tiers || roomKeyFor(booking.tiers.name) !== "PENTHOUSE") return null;
  const { data } = await admin
    .from("bookings")
    .select("status, group_code")
    .eq("tier_id", booking.tier_id);
  const rows = data ?? [];
  const held = rows.filter((b) => b.status === "deposit_paid" || b.status === "paid_in_full");
  return {
    tierName: booking.tiers.name,
    capacity: booking.tiers.max_capacity,
    held: held.length,
    pending: rows.filter((b) => b.status === "pending").length,
    groupCodes: [...new Set(held.map((b) => b.group_code).filter((c): c is string => Boolean(c)))],
  };
}

/**
 * The traveler's personal details, for the insurer and the rental shop.
 * Every read is logged with who asked, so there is a record of each time this
 * was shown. The log line carries ids only, never the details themselves.
 */
async function loadPii(admin: Admin, bookingId: string, adminId: string): Promise<TravelerPii | null> {
  console.info(
    `[admin-audit] traveler details revealed: admin=${adminId} booking=${bookingId} at=${new Date().toISOString()}`,
  );
  const { data, error } = await admin.from("traveler_details").select(PII_SELECT).eq("booking_id", bookingId).maybeSingle();
  if (error) {
    // Code only: Postgres can put the row in an error's details.
    console.error(`admin booking ${bookingId}: traveler details read failed (${error.code})`);
    return null;
  }
  return data;
}
