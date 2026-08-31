import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

// See app/admin/page.tsx for why force-dynamic is needed here too.
export const dynamic = "force-dynamic";

export default async function AdminTripsPage() {
  const admin = createAdminClient();

  const { data: trips } = await admin
    .from("trips")
    .select("id, name, destination, start_date, end_date, status, tiers(id)")
    .order("start_date", { ascending: false });

  return (
    <main>
      <h1>Trips</h1>
      <p>
        <Link href="/admin/trips/new">New trip</Link>
      </p>

      {(!trips || trips.length === 0) && <p>No trips yet.</p>}

      {trips && trips.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Destination</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Tiers</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td>
                  <Link href={`/admin/trips/${trip.id}`}>{trip.name}</Link>
                </td>
                <td>{trip.destination}</td>
                <td>
                  {trip.start_date} to {trip.end_date}
                </td>
                <td>{trip.status}</td>
                <td>{trip.tiers.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
