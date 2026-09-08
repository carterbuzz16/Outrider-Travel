import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingsView, { type BookingRow } from "./BookingsView";

/**
 * The account dashboard: a thin loader in front of BookingsView.
 *
 * Everything the screen renders is decided in that component, so the shape of
 * the query below is the whole contract between them.
 */
export default async function BookingsPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view own bookings", and the matching policies on trips,
  // tiers and payments) scopes every row below to this session's own account,
  // which is why there is no user_id filter here.
  const [{ data: bookings }, { data: profile }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, status, total_amount, deposit_amount, group_code, created_at, trips(name, destination, start_date, end_date), tiers(name), payments(id, status, amount, scheduled_date)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("users").select("name").eq("id", user.id).single(),
  ]);

  // The users row is written by the handle_new_user trigger, but the name only
  // lands there if signup supplied one — fall back to the auth metadata before
  // giving up and showing the email alone.
  const name =
    profile?.name?.trim() ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "") ||
    null;

  return (
    <BookingsView
      email={user.email ?? ""}
      name={name}
      bookings={(bookings ?? []) as BookingRow[]}
      error={searchParams.error}
    />
  );
}
