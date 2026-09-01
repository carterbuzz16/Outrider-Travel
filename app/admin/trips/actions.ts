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
  const logistics = String(formData.get("logistics") ?? "") || null;
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
      logistics,
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

export async function updateTrip(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const destination = String(formData.get("destination") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const description = String(formData.get("description") ?? "") || null;
  const logistics = String(formData.get("logistics") ?? "") || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("trips")
    .update({ name, destination, start_date: startDate, end_date: endDate, description, logistics })
    .eq("id", tripId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/trips/${tripId}`);
}

// Postgres FK is ON DELETE RESTRICT for tiers -> trips and bookings ->
// tiers, so this only succeeds when the trip has no tiers left (and each
// tier only deletes cleanly once it has no bookings) — surface that as a
// plain message instead of a raw Postgres foreign-key error.
export async function deleteTrip(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");

  const admin = createAdminClient();
  const { error } = await admin.from("trips").delete().eq("id", tripId);

  if (error?.code === "23503") {
    redirect(`/admin/trips/${tripId}?error=Remove this trip's tiers before deleting it.`);
  }
  if (error) {
    throw new Error(error.message);
  }

  redirect("/admin/trips");
}

export async function deleteTier(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const tierId = String(formData.get("tier_id") ?? "");

  const admin = createAdminClient();
  const { error } = await admin.from("tiers").delete().eq("id", tierId);

  if (error?.code === "23503") {
    redirect(`/admin/trips/${tripId}?error=This tier has bookings and can't be deleted.`);
  }
  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/trips/${tripId}`);
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadTripImage(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/trips/${tripId}?error=Choose an image file first.`);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    redirect(`/admin/trips/${tripId}?error=Only JPEG, PNG, or WebP images are allowed.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    redirect(`/admin/trips/${tripId}?error=Image must be under 5MB.`);
  }

  const admin = createAdminClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${tripId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage.from("trip-images").upload(path, file, {
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = admin.storage.from("trip-images").getPublicUrl(path);

  const { data: trip } = await admin.from("trips").select("images").eq("id", tripId).single();
  const images = [...(trip?.images ?? []), publicUrlData.publicUrl];

  const { error: updateError } = await admin.from("trips").update({ images }).eq("id", tripId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  redirect(`/admin/trips/${tripId}`);
}

export async function removeTripImage(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");

  const admin = createAdminClient();

  const { data: trip } = await admin.from("trips").select("images").eq("id", tripId).single();
  const images = (trip?.images ?? []).filter((url) => url !== imageUrl);

  const { error: updateError } = await admin.from("trips").update({ images }).eq("id", tripId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  // Best-effort storage cleanup: the public URL always ends in
  // `/trip-images/<path>` for objects in this bucket.
  const path = imageUrl.split("/trip-images/")[1];
  if (path) {
    await admin.storage.from("trip-images").remove([path]);
  }

  redirect(`/admin/trips/${tripId}`);
}

export async function addTier(formData: FormData) {
  await requireAdmin();

  const tripId = String(formData.get("trip_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const price = Number(formData.get("price"));
  const description = String(formData.get("description") ?? "") || null;
  const maxCapacityRaw = String(formData.get("max_capacity") ?? "").trim();
  const maxCapacity = maxCapacityRaw === "" ? null : Number(maxCapacityRaw);
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
