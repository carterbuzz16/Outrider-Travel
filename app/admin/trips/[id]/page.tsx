import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setTripStatus,
  updateTrip,
  deleteTrip,
  deleteTier,
  addTier,
  uploadTripImage,
  removeTripImage,
} from "@/app/admin/trips/actions";

// See app/admin/page.tsx for why force-dynamic is needed here too.
export const dynamic = "force-dynamic";

export default async function AdminTripDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select(
      "id, name, destination, start_date, end_date, description, logistics, status, images, tiers(id, name, price, description, max_capacity, inclusions)"
    )
    .eq("id", params.id)
    .single();

  if (!trip) {
    notFound();
  }

  return (
    <main>
      <h1>{trip.name}</h1>

      {searchParams.error && <p>{searchParams.error}</p>}

      <h2>Details</h2>
      <form action={updateTrip}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" defaultValue={trip.name} required />
        </div>
        <div>
          <label htmlFor="destination">Destination</label>
          <input id="destination" name="destination" type="text" defaultValue={trip.destination} required />
        </div>
        <div>
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" defaultValue={trip.start_date} required />
        </div>
        <div>
          <label htmlFor="end_date">End date</label>
          <input id="end_date" name="end_date" type="date" defaultValue={trip.end_date} required />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={trip.description ?? ""} />
        </div>
        <div>
          <label htmlFor="logistics">
            Logistics (flights, packing, meeting point — included in the confirmation email)
          </label>
          <textarea id="logistics" name="logistics" defaultValue={trip.logistics ?? ""} />
        </div>
        <button type="submit">Save details</button>
      </form>

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

      <form action={deleteTrip}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <button type="submit">Delete trip</button>
      </form>

      <h2>Photos</h2>
      {trip.images.length === 0 && <p>No photos yet.</p>}
      {trip.images.length > 0 && (
        <ul>
          {trip.images.map((url) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin tool, not a customer-facing perf-sensitive page */}
              <img src={url} alt="" width={160} />
              <form action={removeTripImage}>
                <input type="hidden" name="trip_id" value={trip.id} />
                <input type="hidden" name="image_url" value={url} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={uploadTripImage} encType="multipart/form-data">
        <input type="hidden" name="trip_id" value={trip.id} />
        <label htmlFor="image">Add a photo (JPEG/PNG/WebP, under 5MB)</label>
        <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
        <button type="submit">Upload</button>
      </form>

      <h2>Tiers</h2>
      {trip.tiers.length === 0 && <p>No tiers yet — add one below before publishing.</p>}
      {trip.tiers.length > 0 && (
        <ul>
          {trip.tiers.map((tier) => (
            <li key={tier.id}>
              <strong>{tier.name}</strong> — ${tier.price} ({tier.max_capacity === null ? "no capacity limit" : `max ${tier.max_capacity}`})
              {tier.description && <p>{tier.description}</p>}
              {tier.inclusions && tier.inclusions.length > 0 && <p>Includes: {tier.inclusions.join(", ")}</p>}
              <form action={deleteTier}>
                <input type="hidden" name="trip_id" value={trip.id} />
                <input type="hidden" name="tier_id" value={tier.id} />
                <button type="submit">Delete tier</button>
              </form>
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
          <label htmlFor="tier-max-capacity">Max capacity (leave blank for no limit)</label>
          <input id="tier-max-capacity" name="max_capacity" type="number" min="1" />
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
