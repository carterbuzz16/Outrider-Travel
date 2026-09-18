import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import DashboardView from "./DashboardView";
import { ADMIN_ERRORS, ADMIN_ERROR_FALLBACK, ADMIN_MESSAGES, ADMIN_MESSAGE_FALLBACK, flashText } from "@/lib/flash";

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
export default async function AdminDashboardPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  // Checked here as well as in the layout: on a client navigation Next can
  // render a page segment without re-running the layout above it.
  await requireAdmin();
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, status, total_amount, deposit_amount, group_code, created_at, users(email), trips(name), tiers(name), payments(id, amount, status, scheduled_date, attempt_count, paid_at)"
    )
    .order("created_at", { ascending: false });

  // Every penthouse on a trip that has not finished, for the claim panel.
  const { data: penthouses } = await admin
    .from("tiers")
    .select(
      "id, name, max_capacity, trip_id, trips!inner(name, start_date), bookings(id, status, group_code, created_at, payments(paid_at, scheduled_date))"
    )
    .eq("group_exclusive", true)
    .gte("trips.start_date", today);

  return (
    <DashboardView
      bookings={bookings ?? []}
      today={today}
      penthouses={penthouses ?? []}
      // Codes only; see lib/flash.ts. What the cancel and remove buttons
      // report back when they land here.
      message={flashText(ADMIN_MESSAGES, searchParams.message, ADMIN_MESSAGE_FALLBACK)}
      error={flashText(ADMIN_ERRORS, searchParams.error, ADMIN_ERROR_FALLBACK)}
    />
  );
}
