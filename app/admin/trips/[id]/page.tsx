import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import TripEditor from "./TripEditor";

// See app/admin/page.tsx for why force-dynamic is needed here too.
export const dynamic = "force-dynamic";

export default async function AdminTripDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const admin = createAdminClient();

  // `bookings(id, status)` is embedded under tiers so each tier can show how
  // many spots it has sold against its own cap. Bookings carry both trip_id
  // and tier_id, but only one foreign key points at tiers, so the embed is
  // unambiguous.
  const { data: trip } = await admin
    .from("trips")
    .select(
      "id, name, destination, start_date, end_date, description, logistics, status, images, tiers(id, name, price, description, max_capacity, inclusions, bookings(id, status))"
    )
    .eq("id", params.id)
    .single();

  if (!trip) {
    notFound();
  }

  return <TripEditor trip={trip} error={searchParams.error} />;
}
