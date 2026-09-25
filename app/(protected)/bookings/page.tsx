import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncRecentPaymentsForUser } from "@/lib/stripe-sync";
import BookingsView, { type BookingRow } from "./BookingsView";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPenthouseProgress } from "@/lib/tier-claims";
import { toSnapshot } from "@/lib/penthouse";
import { ACCOUNT_ERRORS, ACCOUNT_ERROR_FALLBACK, flashText } from "@/lib/flash";
import { bookingsOpenForViewer } from "@/lib/early-access";

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
        "id, trip_id, tier_id, status, total_amount, deposit_amount, group_code, created_at, trips(name, destination, start_date, end_date), tiers(name), payments(id, status, amount, scheduled_date)"
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

  // Penthouse bookings carry their group's fill progress. The count spans other
  // travelers' rows, which this session cannot read, so it goes through the
  // service role and comes back as numbers only.
  // Only once something is paid: an unpaid checkout is not a place in it yet.
  const live = (bookings ?? []).filter((b) => b.status === "deposit_paid" || b.status === "paid_in_full");
  const progress = await getPenthouseProgress(createAdminClient(), live);
  const renderedAt = new Date().toISOString();
  const rows: BookingRow[] = (bookings ?? []).map((b) => {
    const fill = progress.get(b.id);
    return { ...(b as BookingRow), penthouse: fill ? { snapshot: toSnapshot(fill), renderedAt } : null };
  });

  return (
    <BookingsView
      email={user.email ?? ""}
      name={name}
      bookings={rows}
      canBook={await bookingsOpenForViewer()}
      // A code, turned into words here; the query string never carries a sentence.
      error={flashText(ACCOUNT_ERRORS, searchParams.error, ACCOUNT_ERROR_FALLBACK)}
    />
  );
}
