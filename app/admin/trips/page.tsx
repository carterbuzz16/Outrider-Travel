import { createAdminClient } from "@/lib/supabase/admin";
import TripsView from "./TripsView";

// See app/admin/page.tsx for why force-dynamic is needed here too.
export const dynamic = "force-dynamic";

export default async function AdminTripsPage() {
  const admin = createAdminClient();

  // `tiers(max_capacity)` and `bookings(status)` are embedded rather than
  // counted in a second round trip: the list has to show how full each
  // departure is, and both relations are small (a handful of tiers, tens of
  // bookings) for the volume this tool is built for.
  const { data: trips } = await admin
    .from("trips")
    .select(
      "id, name, destination, start_date, end_date, status, tiers(id, max_capacity), bookings(id, status)"
    )
    .order("start_date", { ascending: false });

  return <TripsView trips={trips ?? []} />;
}
