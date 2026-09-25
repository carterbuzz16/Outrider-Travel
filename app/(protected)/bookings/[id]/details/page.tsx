import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chooseAgainPath, isStalePending, recheckStaleCheckout, staleCheckoutCode } from "@/lib/stale-checkout";
import { formatDateRange } from "@/lib/trips";
import { tierDisplayName } from "@/lib/tier-display";
import CheckoutSteps from "@/components/CheckoutSteps";
import IdentityForm from "./IdentityForm";

/**
 * Step 2 of checkout: who is going.
 *
 * createBooking sends the traveler to the payment step, and the payment step
 * sends them here first if this half of traveler_details is missing, so the
 * card is never shown for a booking nobody is named on. The same check runs
 * again in acceptTermsForBooking, since a redirect is presentation and the
 * card form can be reached by other means.
 *
 * Also reachable on purpose from the payment step, to fix a typo before
 * paying. A booking already paid for is sent to its confirmation; the trip
 * page is where its details are finished.
 */
export default async function DetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view own bookings") scopes this to the signed-in user.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, created_at, trips(name, start_date, end_date), tiers(name)")
    .eq("id", params.id)
    .single();

  if (!booking) {
    notFound();
  }

  if (booking.status !== "pending") {
    redirect(`/bookings/${booking.id}/confirmation`);
  }

  // The same release the payment step does, here too, so a checkout whose
  // bed has gone is not asked for a date of birth first and told after.
  if (isStalePending(booking)) {
    const stale = await recheckStaleCheckout(createAdminClient(), booking.id);
    if (!stale.ok) redirect(chooseAgainPath(stale.tripId, staleCheckoutCode(stale.reason)));
  }

  // Existence only, as on the portal: nothing typed is read back onto a page.
  // The admin client, because the table is service-role only.
  const { data: saved } = await createAdminClient()
    .from("traveler_details")
    .select("submitted_at")
    .eq("booking_id", booking.id)
    .maybeSingle();

  const trip = booking.trips;
  const payHref = `/bookings/${booking.id}/pay`;

  return (
    <main>
      <div className="shell max-w-[48rem] pb-20 pt-8 md:pb-28 md:pt-12">
        <CheckoutSteps current={2} />

        <header className="mt-8 border-b border-[--rule] pb-6 md:mt-10">
          <h1 className="t-heading text-[--text]">Who&rsquo;s going</h1>
          <p className="mt-2 max-w-measure font-body text-body leading-[1.65] text-[--text-secondary]">
            Your legal name and date of birth go on your lift tickets and lodging records. The rest
            is so we can reach you, and reach someone else if we ever need to. Your place is held
            for 30 minutes while you finish.
          </p>
          {trip && (
            <p className="mt-4 font-body text-body-s text-[--text-secondary]">
              <span className="text-[--text]">{trip.name}</span>, {formatDateRange(trip.start_date, trip.end_date)}
              {booking.tiers ? `. ${tierDisplayName(booking.tiers.name)}` : ""}
            </p>
          )}
        </header>

        <IdentityForm
          className="mt-8"
          bookingId={booking.id}
          defaultName={typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null}
          saved={Boolean(saved)}
          payHref={payHref}
        />

        <div className="mt-10 border-t border-[--rule] pt-6">
          <Link
            href="/bookings"
            className="inline-flex min-h-11 items-center font-body text-body-s text-[--text-secondary] underline underline-offset-4 hover:text-[--text]"
          >
            Back to your bookings
          </Link>
        </div>
      </div>
    </main>
  );
}
