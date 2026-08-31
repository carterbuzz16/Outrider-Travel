import { createAdminClient } from "@/lib/supabase/admin";

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

  return (
    <main>
      <h1>Flagged installments</h1>
      <p>Payments that failed twice or are stuck waiting on customer authentication.</p>

      {(!flagged || flagged.length === 0) && <p>Nothing flagged.</p>}

      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Trip</th>
            <th>Amount</th>
            <th>Due</th>
            <th>Status</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {flagged?.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.bookings?.users?.email}</td>
              <td>{payment.bookings?.trips?.name}</td>
              <td>${payment.amount}</td>
              <td>{payment.scheduled_date}</td>
              <td>{payment.status}</td>
              <td>{payment.attempt_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
