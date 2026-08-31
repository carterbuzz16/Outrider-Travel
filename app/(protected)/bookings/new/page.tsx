import { createClient } from "@/lib/supabase/server";
import { createBooking } from "@/app/(protected)/bookings/actions";
import { computeDepositAmount } from "@/lib/deposit";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select(
      "id, name, destination, start_date, end_date, description, tiers(id, name, price, description, max_capacity)"
    )
    .eq("status", "published")
    .order("start_date");

  return (
    <main>
      <h1>Book a trip</h1>

      {searchParams.error && <p>{searchParams.error}</p>}
      {(!trips || trips.length === 0) && <p>No trips available right now.</p>}

      {trips?.map((trip) => (
        <section key={trip.id}>
          <h2>
            {trip.name} — {trip.destination}
          </h2>
          <p>
            {trip.start_date} to {trip.end_date}
          </p>
          {trip.description && <p>{trip.description}</p>}

          <ul>
            {trip.tiers.map((tier) => (
              <li key={tier.id}>
                <strong>{tier.name}</strong> — ${tier.price} (max {tier.max_capacity})
                {tier.description && <p>{tier.description}</p>}
                <form action={createBooking}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <input type="hidden" name="tierId" value={tier.id} />
                  <button type="submit">
                    Select — ${computeDepositAmount(tier.price).toFixed(2)} deposit due now
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
