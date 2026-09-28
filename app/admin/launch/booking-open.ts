import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { isDeliverableEmail } from "@/lib/waitlist-signup";

type Admin = SupabaseClient<Database>;

export type ReminderRecipient = { id: string; email: string; unsubscribe_token: string };

/*
 * Who the "booking is open to everyone" reminder reaches right now: list
 * members who are still subscribed, have not said no to email, have not had
 * it, and have not booked. Read by the page (to say how many) and by the send
 * (which is the control), so the number on the button is the number mailed.
 *
 * "Booked" is a paid booking (deposit or in full) under the same address,
 * compared without case: the list stores what the form sent, accounts store
 * what signup sent. Someone mid-checkout has not paid, so still gets it.
 *
 * Fails closed: if the bookings cannot be read, it returns null and nothing
 * goes, rather than mail people who may already have booked.
 */
export async function bookingOpenRecipients(admin: Admin): Promise<{
  deliverable: ReminderRecipient[];
  undeliverable: string[];
  alreadyBooked: number;
} | null> {
  const [signups, live] = await Promise.all([
    admin
      .from("waitlist_signups")
      .select("id, email, unsubscribe_token")
      .is("unsubscribed_at", null)
      .is("booking_open_sent_at", null)
      // Null is everyone who joined before the consent checkbox existed, as
      // in the head-start send. Only an explicit false stays out.
      .or("email_consent.is.null,email_consent.eq.true")
      .order("created_at", { ascending: true }),
    admin.from("bookings").select("users(email)").in("status", ["deposit_paid", "paid_in_full"]),
  ]);

  if (signups.error || live.error) {
    const err = signups.error ?? live.error;
    console.error(`booking-open recipients read failed: ${err?.code} ${err?.message}`);
    return null;
  }

  const booked = new Set(
    ((live.data ?? []) as { users: { email: string } | null }[])
      .map((row) => row.users?.email?.toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  const rows = signups.data ?? [];
  const notBooked = rows.filter((row) => !booked.has(row.email.toLowerCase()));

  return {
    deliverable: notBooked.filter((row) => isDeliverableEmail(row.email)),
    undeliverable: notBooked.filter((row) => !isDeliverableEmail(row.email)).map((row) => row.email),
    alreadyBooked: rows.length - notBooked.length,
  };
}
