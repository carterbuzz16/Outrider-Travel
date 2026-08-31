"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

type TripStatus = Database["public"]["Enums"]["trip_status"];
const TRIP_STATUSES: TripStatus[] = ["draft", "published", "closed"];

function parseTripStatus(value: FormDataEntryValue | null): TripStatus {
  const status = String(value ?? "draft");
  if (!TRIP_STATUSES.includes(status as TripStatus)) {
    throw new Error(`Invalid trip status: ${status}`);
  }
  return status as TripStatus;
}

// Server actions are callable directly, independent of whether the
// triggering page ever rendered — the admin/layout.tsx gate alone isn't
// enough. Same role check, duplicated here for defense in depth.
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/bookings");
}

export async function createTrip(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "");
  const destination = String(formData.get("destination") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const description = String(formData.get("description") ?? "") || null;
  const status = parseTripStatus(formData.get("status"));

  const admin = createAdminClient();
  const { data: trip, error } = await admin
    .from("trips")
    .insert({
      name,
      destination,
      start_date: startDate,
      end_date: endDate,
      description,
      status,
    })
    .select("id")
    .single();

  if (error || !trip) {
    throw new Error(error?.message ?? "Failed to create trip");
  }

  redirect(`/admin/trips/${trip.id}`);
}

export async function setTripStatus(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const status = parseTripStatus(formData.get("status"));

  const admin = createAdminClient();
  const { error } = await admin.from("trips").update({ status }).eq("id", tripId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/trips/${tripId}`);
}

export async function addTier(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const price = Number(formData.get("price"));
  const description = String(formData.get("description") ?? "") || null;
  const maxCapacity = Number(formData.get("max_capacity"));
  const inclusionsRaw = String(formData.get("inclusions") ?? "");
  const inclusions = inclusionsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const admin = createAdminClient();
  const { error } = await admin.from("tiers").insert({
    trip_id: tripId,
    name,
    price,
    description,
    max_capacity: maxCapacity,
    inclusions,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/trips/${tripId}`);
}
