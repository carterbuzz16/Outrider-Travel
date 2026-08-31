import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BookingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, deposit_amount, trips(name, destination), tiers(name), payments(id, status, amount, scheduled_date)"
    )
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Your bookings</h1>
      <p>Logged in as {user?.email}.</p>
      <p>
        <Link href="/bookings/new">Book a new trip</Link>
      </p>

      {(!bookings || bookings.length === 0) && <p>No bookings yet.</p>}

      <ul>
        {bookings?.map((booking) => {
          const needsAuth = booking.payments.find((p) => p.status === "requires_action");
          const upcoming = booking.payments
            .filter((p) => p.status === "scheduled")
            .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

          return (
            <li key={booking.id}>
              {booking.trips?.name} ({booking.tiers?.name}) — {booking.status} — deposit $
              {booking.deposit_amount}
              {booking.status === "pending" && (
                <>
                  {" "}
                  · <Link href={`/bookings/${booking.id}/pay`}>Pay deposit</Link>
                </>
              )}
              {needsAuth && (
                <p>
                  ⚠ Your bank needs to verify your next installment (${needsAuth.amount}) —{" "}
                  <Link href={`/bookings/${booking.id}/installments/${needsAuth.id}`}>
                    complete verification
                  </Link>
                </p>
              )}
              {!needsAuth && upcoming.length > 0 && (
                <ul>
                  {upcoming.map((p) => (
                    <li key={p.id}>
                      Installment ${p.amount} due {p.scheduled_date}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
