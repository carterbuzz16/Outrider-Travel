import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Excludes 0/O/1/I/L — easy to misread or mistype when read aloud or typed
// from memory, which is exactly how these get shared between friends.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// Codes are scoped per trip, not global: booking the same trip as a friend
// means matching their code, and a coincidental match on an unrelated trip
// is harmless since group_code is never queried without trip_id alongside
// it (see the bookings_trip_id_group_code_idx index).
export async function resolveGroupCode(
  admin: SupabaseClient<Database>,
  tripId: string,
  requestedCode: string | null
): Promise<{ code: string } | { error: string }> {
  if (requestedCode) {
    const normalized = requestedCode.trim().toUpperCase();
    const { data } = await admin
      .from("bookings")
      .select("id")
      .eq("trip_id", tripId)
      .eq("group_code", normalized)
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { error: "That group code wasn't found for this trip. Double-check it, or leave it blank to start a new group." };
    }
    return { code: normalized };
  }

  // Every booking gets a code even when nobody asked to join one, so
  // there's always something to share later — collision within one trip
  // is astronomically unlikely at 32^6 combinations, but retry rather
  // than assume.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const { data } = await admin
      .from("bookings")
      .select("id")
      .eq("trip_id", tripId)
      .eq("group_code", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return { code: candidate };
  }

  throw new Error("Could not generate a unique group code after 5 attempts");
}
