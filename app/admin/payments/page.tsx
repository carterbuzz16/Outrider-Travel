import { createAdminClient } from "@/lib/supabase/admin";
import FlaggedPaymentsView from "./FlaggedPaymentsView";

// No dynamic route segment, so without this Next attempts to prerender it
// at build time — executing createAdminClient() along the way, which
// throws whenever SUPABASE_SERVICE_ROLE_KEY isn't set (e.g. a fresh clone
// or CI without secrets). Force dynamic so that trial render never happens.
export const dynamic = "force-dynamic";

// admin/layout.tsx already gates this route on role = 'admin'. Reads here
// use the service-role client (not the signed-in user's client) because
// there's no "admins can read all bookings/payments" RLS policy yet — this
// is a read-only internal report, not a privileged write, so that's an
// acceptable use of the same admin client the checkout flow already relies on.
//
// Reads every booking with its payments rather than only the failed rows: a
// payment row alone does not say whether it is a deposit, a payment in full,
// an installment or an early payment, and whether a booking is overpaid is a
// sum across its rows. payment-ledger.ts works both out from the booking as a
// whole, the same way the overview does.
export default async function FlaggedPaymentsPage() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, status, total_amount, deposit_amount, group_code, created_at, users(email), trips(name), tiers(name), payments(id, amount, status, scheduled_date, attempt_count, paid_at)"
    )
    .order("created_at", { ascending: false });

  return <FlaggedPaymentsView bookings={bookings ?? []} today={today} />;
}
