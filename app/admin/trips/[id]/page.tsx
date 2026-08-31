import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setTripStatus, addTier } from "@/app/admin/trips/actions";

// See app/admin/page.tsx for why force-dynamic is needed here too.
export const dynamic = "force-dynamic";

export default async function AdminTripDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select("id, name, destination, start_date, end_date, description, status, tiers(id, name, price, description, max_capacity, inclusions)")
    .eq("id", params.id)
    .single();

  if (!trip) {
    notFound();
  }

  return (
    <main>
      <h1>{trip.name}</h1>
      <p>
        {trip.destination} — {trip.start_date} to {trip.end_date}
      </p>
      {trip.description && <p>{trip.description}</p>}

      <form action={setTripStatus}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={trip.status}>
          <option value="draft">Draft (hidden from customers)</option>
          <option value="published">Published (bookable now)</option>
          <option value="closed">Closed</option>
        </select>
        <button type="submit">Update status</button>
      </form>

      <h2>Tiers</h2>
      {trip.tiers.length === 0 && <p>No tiers yet — add one below before publishing.</p>}
      {trip.tiers.length > 0 && (
        <ul>
          {trip.tiers.map((tier) => (
            <li key={tier.id}>
              <strong>{tier.name}</strong> — ${tier.price} (max {tier.max_capacity})
              {tier.description && <p>{tier.description}</p>}
              {tier.inclusions && tier.inclusions.length > 0 && <p>Includes: {tier.inclusions.join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}

      <h3>Add a tier</h3>
      <form action={addTier}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <div>
          <label htmlFor="tier-name">Name</label>
          <input id="tier-name" name="name" type="text" required />
        </div>
        <div>
          <label htmlFor="tier-price">Price (USD)</label>
          <input id="tier-price" name="price" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <label htmlFor="tier-max-capacity">Max capacity</label>
          <input id="tier-max-capacity" name="max_capacity" type="number" min="1" required />
        </div>
        <div>
          <label htmlFor="tier-description">Description</label>
          <textarea id="tier-description" name="description" />
        </div>
        <div>
          <label htmlFor="tier-inclusions">Inclusions (comma-separated)</label>
          <input id="tier-inclusions" name="inclusions" type="text" placeholder="Flights, Hotel, Meals" />
        </div>
        <button type="submit">Add tier</button>
      </form>
    </main>
  );
}
