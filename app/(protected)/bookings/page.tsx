import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncRecentPaymentsForUser } from "@/lib/stripe-sync";
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

  // Before reading anything: settle any of this traveler's recent payments
  // that Stripe has taken but no webhook has reported (a preview deployment
  // never gets one, and production can miss one). Bounded to a handful of
  // recent intents, run in parallel, and it never throws, so a Stripe outage
  // costs a stale row, not the page. See lib/stripe-sync.ts.
  await syncRecentPaymentsForUser(user.id);

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
