import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Days before trip start_date that each installment is due. Fixed calendar
// dates relative to the trip, not the booking date — a booking made close
// to departure will simply have installments whose dates are already in
// the past, which the cron picks up on its very next run.
export const INSTALLMENT_OFFSETS_DAYS = [90, 30];

// Called once, right after the deposit's payment_intent.succeeded webhook
// flips the booking pending -> deposit_paid (see lib/payments.ts). Splits
// evenly with the last installment absorbing any rounding remainder so the
// installments always sum exactly to the remaining balance.
export async function scheduleInstallments(
  admin: SupabaseClient<Database>,
  booking: { id: string; trip_id: string; total_amount: number; deposit_amount: number }
) {
  const remaining = Math.round((booking.total_amount - booking.deposit_amount) * 100) / 100;
  if (remaining <= 0) return;

  const { data: trip } = await admin
    .from("trips")
    .select("start_date")
    .eq("id", booking.trip_id)
    .single();

  if (!trip) return;

  const n = INSTALLMENT_OFFSETS_DAYS.length;
  const base = Math.floor((remaining / n) * 100) / 100;
  const amounts = Array(n).fill(base);
  amounts[n - 1] = Math.round((remaining - base * (n - 1)) * 100) / 100;

  const rows = INSTALLMENT_OFFSETS_DAYS.map((offsetDays, i) => {
    const date = new Date(trip.start_date);
    date.setUTCDate(date.getUTCDate() - offsetDays);
    return {
      booking_id: booking.id,
      amount: amounts[i],
      status: "scheduled" as const,
      scheduled_date: date.toISOString().slice(0, 10),
    };
  });

  await admin.from("payments").insert(rows);
}
