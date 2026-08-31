import Link from "next/link";
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
export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("bookings")
    .select(
      "id, status, total_amount, deposit_amount, created_at, users(email), trips(name), tiers(name), payments(id, amount, status, scheduled_date, attempt_count)"
    )
    .order("created_at", { ascending: false });

  const flaggedCount = (bookings ?? []).reduce((count, booking) => {
    const flagged = (booking.payments ?? []).filter(
      (payment) =>
        payment.status === "failed" ||
        payment.status === "requires_action" ||
        (payment.status === "scheduled" && payment.scheduled_date && payment.scheduled_date < today)
    );
    return count + flagged.length;
  }, 0);

  return (
    <main>
      <h1>Admin dashboard</h1>
      <p>
        {flaggedCount > 0
          ? `${flaggedCount} installment payment${flaggedCount === 1 ? "" : "s"} need attention (overdue, failed, or needs authentication) — flagged below.`
          : "No overdue or failed installments."}
      </p>
      <p>
        <Link href="/admin/payments">Failed / needs-authentication installments only</Link>
      </p>
      <p>
        <Link href="/admin/trips">Manage trips</Link>
      </p>

      {(!bookings || bookings.length === 0) && <p>No bookings yet.</p>}

      {bookings && bookings.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Trip</th>
              <th>Tier</th>
              <th>Booking status</th>
              <th>Total</th>
              <th>Deposit</th>
              <th>Payment schedule</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.users?.email}</td>
                <td>{booking.trips?.name}</td>
                <td>{booking.tiers?.name}</td>
                <td>{booking.status}</td>
                <td>${booking.total_amount}</td>
                <td>${booking.deposit_amount}</td>
                <td>
                  {booking.payments && booking.payments.length > 0 ? (
                    <ul>
                      {booking.payments.map((payment) => {
                        const overdue =
                          payment.status === "scheduled" &&
                          !!payment.scheduled_date &&
                          payment.scheduled_date < today;
                        const flagged = overdue || payment.status === "failed" || payment.status === "requires_action";

                        return (
                          <li key={payment.id}>
                            ${payment.amount} due {payment.scheduled_date ?? "—"} — {payment.status}
                            {overdue && " (OVERDUE)"}
                            {payment.attempt_count > 0 && ` (${payment.attempt_count} attempt${payment.attempt_count === 1 ? "" : "s"})`}
                            {flagged && " ⚠"}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
