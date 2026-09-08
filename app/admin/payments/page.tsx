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
export default async function FlaggedPaymentsPage() {
  const admin = createAdminClient();

  const { data: flagged } = await admin
    .from("payments")
    .select(
      "id, status, amount, scheduled_date, attempt_count, booking_id, bookings(id, users(email), trips(name))"
    )
    .in("status", ["failed", "requires_action"])
    .order("scheduled_date");

  return <FlaggedPaymentsView payments={flagged ?? []} />;
}
