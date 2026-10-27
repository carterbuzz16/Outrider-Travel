/*
 * The words behind /admin/ambassadors' ?done= and ?error= (./actions.ts). A
 * code, never a sentence, in the address bar, for the same reason as
 * lib/flash.ts. Counts after a settle or release are read as numbers.
 */

export const AMBASSADOR_ERRORS: Readonly<Record<string, string>> = {
  bad_code: "A code is 3 to 32 letters and digits.",
  missing_name: "Give the ambassador a name.",
  bad_status: "That isn't a held-spot status.",
  code_is_discount: "That code already takes money off, so it can't be someone's referral code. Pick another.",
  already_ambassador: "That code already belongs to an ambassador.",
  save_failed: "That didn't save. Try again, and check the logs if it keeps happening.",
  missing_booking: "Give a booking id or the traveler's email.",
  no_account: "No account uses that email.",
  no_live_booking: "That traveler has no paid booking to credit.",
  several_bookings: "That traveler has more than one booking. Use the booking id instead.",
  no_booking: "No booking has that id.",
  is_hold: "That booking is a held spot, which never counts toward anyone's five.",
  has_hold: "This ambassador already has a held spot.",
  no_email: "Add the ambassador's email first: the spot is booked on their account.",
  no_trip: "Choose the ambassador's trip first.",
  no_base_tier: "That trip has no Four to a Room package.",
  sold_out: "Four to a Room is full on that trip.",
  bad_date: "That pay-by date didn't read as a date.",
  load_failed: "The ambassadors couldn't be loaded. Has the referrals_and_ambassadors migration run?",
  too_early: "Spots can be released only after the signup deadline.",
  move_failed:
    "That booking couldn't be moved. Something on it is failed, mid-charge or already moved: check its payments.",
};

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function ambassadorDone(params: Record<string, string | undefined>): string | null {
  const n = (key: string) => Math.max(0, Number.parseInt(params[key] ?? "0", 10) || 0);
  switch (params.done) {
    case "added":
      return "Ambassador added, with their code.";
    case "saved":
      return "Saved.";
    case "attached":
      return "Booking credited to this ambassador.";
    case "removed":
      return "Credit removed from that booking.";
    case "held":
      return "Spot held on Four to a Room.";
    case "moved":
      return "Moved to the new schedule: one payment on the signup deadline.";
    case "settled":
      return `Settled: ${n("free")} made free, ${plural(n("sent"), "payment link")} sent${n("skipped") ? `, ${n("skipped")} left for you to check (money already paid, or no email or trip)` : ""}.`;
    case "released":
      return `Released ${plural(n("released"), "unpaid spot")}${n("skipped") ? `, ${n("skipped")} left for you (part paid)` : ""}.`;
    default:
      return null;
  }
}
