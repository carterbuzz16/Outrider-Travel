import { createTrip } from "@/app/admin/trips/actions";

export default function NewTripPage() {
  return (
    <main>
      <h1>New trip</h1>
      <form action={createTrip}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div>
          <label htmlFor="destination">Destination</label>
          <input id="destination" name="destination" type="text" required />
        </div>
        <div>
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" required />
        </div>
        <div>
          <label htmlFor="end_date">End date</label>
          <input id="end_date" name="end_date" type="date" required />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" />
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue="draft">
            <option value="draft">Draft (hidden from customers)</option>
            <option value="published">Published (bookable now)</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button type="submit">Create trip</button>
      </form>
    </main>
  );
}
