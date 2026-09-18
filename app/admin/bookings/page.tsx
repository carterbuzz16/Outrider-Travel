import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import BookingsListView from "./BookingsListView";
import { BOOKING_ROW_SELECT, applyFilters, parseFilters, toListRow, type BookingRow } from "./booking-rows";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

// Always rendered per request: the list is live, and LiveRefresh re-renders
// it every 30 seconds. See app/admin/page.tsx for the build-time reason too.
export const dynamic = "force-dynamic";

// Reads through the service-role client, like the overview: there is no
// "admins can read every booking" RLS policy. The role is checked here as well
// as in the layout, so this page never renders booking data on the layout's
// word alone.
export default async function AdminBookingsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = parseFilters(await props.searchParams);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`admin bookings list: ${error.code} ${error.message}`);
  }

  const renderedAt = new Date();
  const today = renderedAt.toISOString().slice(0, 10);
  const all = ((data ?? []) as BookingRow[]).map((booking) =>
    toListRow(booking, today, renderedAt.getTime()),
  );

  // The filter choices come from what has actually been booked, so the
  // dropdowns never offer a departure or package with nothing behind it.
  const trips = new Map<string, { id: string; name: string; start_date: string }>();
  const tiers = new Set<string>();
  for (const { booking } of all) {
    if (booking.trips) trips.set(booking.trips.id, booking.trips);
    if (booking.tiers) tiers.add(booking.tiers.name);
  }

  return (
    <BookingsListView
      rows={applyFilters(all, filters)}
      total={all.length}
      newCount={all.filter((row) => row.isNew).length}
      filters={filters}
      trips={[...trips.values()].sort((a, b) => a.start_date.localeCompare(b.start_date))}
      tiers={[...tiers].sort()}
      renderedAt={renderedAt.toISOString()}
      loadFailed={Boolean(error)}
    />
  );
}
