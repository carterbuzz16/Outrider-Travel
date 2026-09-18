import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { roomKeyFor } from "@/lib/room-media";
import { confirmationNumber } from "@/lib/confirmation-number";
import { slugify } from "@/app/admin/csv";
import type { BookingStatus } from "@/app/admin/admin-ui";
import type { LedgerPayment } from "@/app/admin/payment-ledger";
import { tasksFor, type Tasks } from "@/app/admin/bookings/booking-rows";

/*
 * One departure's roster, read once for the roster page and for every CSV.
 *
 * No traveler PII here: names, emails, packages, rooming and task state only.
 * The exports that need the sensitive columns read them separately
 * (loadTravelerPii), so the roster page can never carry them.
 *
 * "On the roster" means a spot held: deposit paid or paid in full, the same
 * rule countHeld and the public availability use. A pending booking is a
 * checkout someone opened, and a cancelled one gave its spot back; the page
 * counts them but the lists and the files leave them out.
 */

export type RosterTier = { id: string; name: string; max_capacity: number | null; isPenthouse: boolean };

export type RosterBooking = {
  id: string;
  confirmation: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  created_at: string;
  sms_consent: boolean;
  name: string | null;
  email: string | null;
  tierId: string | null;
  tierName: string | null;
  tasks: Tasks;
  payments: LedgerPayment[];
  rooming: { roommate_names: string[]; no_preference: boolean; submitted_at: string } | null;
};

export type Roster = {
  trip: { id: string; name: string; destination: string; start_date: string; end_date: string };
  tiers: RosterTier[];
  /** Every booking on the departure, newest first. */
  all: RosterBooking[];
  /** Spots held, oldest first. */
  held: RosterBooking[];
  /** outrider-telluride-2026-12-14 */
  filePrefix: string;
};

const HELD: BookingStatus[] = ["deposit_paid", "paid_in_full"];

export async function loadRoster(tripId: string): Promise<Roster | null> {
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, name, destination, start_date, end_date, tiers(id, name, max_capacity, price)")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, status, total_amount, deposit_amount, group_code, created_at, sms_consent, flights_booked, rooming_submitted, details_submitted, users(name, email), tiers(id, name), payments(id, amount, status, scheduled_date, attempt_count, paid_at), rooming_requests(roommate_names, no_preference, submitted_at), traveler_details(submitted_at)",
    )
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(`admin roster ${tripId}: ${error.code} ${error.message}`);
    throw new Error("Could not load the roster.");
  }

  const all: RosterBooking[] = (bookings ?? []).map((b) => ({
    id: b.id,
    confirmation: confirmationNumber(b.id),
    status: b.status,
    total_amount: b.total_amount,
    deposit_amount: b.deposit_amount,
    group_code: b.group_code,
    created_at: b.created_at,
    sms_consent: b.sms_consent,
    name: b.users?.name ?? null,
    email: b.users?.email ?? null,
    tierId: b.tiers?.id ?? null,
    tierName: b.tiers?.name ?? null,
    tasks: tasksFor(b),
    payments: b.payments,
    rooming: b.rooming_requests,
  }));

  const tiers = [...(trip.tiers ?? [])]
    .sort((a, b) => Number(a.price) - Number(b.price))
    .map((t) => ({
      id: t.id,
      name: t.name,
      max_capacity: t.max_capacity,
      isPenthouse: roomKeyFor(t.name) === "PENTHOUSE",
    }));

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
    },
    tiers,
    all,
    held: all.filter((b) => HELD.includes(b.status)).reverse(),
    filePrefix: `outrider-${slugify(trip.destination.split(",")[0] || trip.name)}-${trip.start_date}`,
  };
}

export type TravelerPiiRow = {
  booking_id: string;
  legal_name: string;
  date_of_birth: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  ski_or_board: string;
  ability_level: string;
  height: string | null;
  weight: string | null;
  shoe_size: string | null;
  dietary_restrictions: string | null;
};

/**
 * The traveler_details rows for the given bookings, keyed by booking id. Only
 * the CSV route calls this, after its own admin check, and it logs the export.
 */
export async function loadTravelerPii(bookingIds: string[]): Promise<Map<string, TravelerPiiRow>> {
  const out = new Map<string, TravelerPiiRow>();
  if (bookingIds.length === 0) return out;
  const { data, error } = await createAdminClient()
    .from("traveler_details")
    .select(
      "booking_id, legal_name, date_of_birth, phone, emergency_contact_name, emergency_contact_phone, ski_or_board, ability_level, height, weight, shoe_size, dietary_restrictions",
    )
    .in("booking_id", bookingIds);
  if (error) {
    // Code only: Postgres can put the row in an error's details.
    console.error(`admin roster export: traveler details read failed (${error.code})`);
    throw new Error("Could not read traveler details.");
  }
  for (const row of data ?? []) out.set(row.booking_id, row);
  return out;
}

/** Held bookings in the order their rooming requests first arrived; those with none last, oldest booking first. */
export function roomingOrder(held: RosterBooking[]): RosterBooking[] {
  return [...held].sort((a, b) => {
    if (a.rooming && b.rooming) return a.rooming.submitted_at.localeCompare(b.rooming.submitted_at);
    if (a.rooming) return -1;
    if (b.rooming) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}
