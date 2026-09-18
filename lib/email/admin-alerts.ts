import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getFromAddress, sendEmail } from "@/lib/email/send";
import { renderEmailLayout } from "@/lib/email/layout";
import { confirmationNumber } from "@/lib/confirmation-number";
import { formatAmount, toCents } from "@/lib/balance";
import { getAppUrl } from "@/lib/site-url";

/*
 * Mail to the owner, not to travelers.
 *
 * The new-booking alert goes out when a booking's first payment (the deposit
 * or the whole price) has settled. lib/payments.ts calls it only from the
 * caller that has just sent that booking's confirmation email, which is
 * claimed once per booking on bookings.confirmation_email_sent_at (see
 * lib/email/post-booking.ts), so the alert inherits the same once-only
 * guarantee without a claim of its own.
 *
 * Silent no-op unless ADMIN_NOTIFY_TO is set, same as WAITLIST_NOTIFY_TO in
 * lib/email/send.ts. The caller treats any failure as non-fatal: a missed
 * alert must never get in the way of settling a payment.
 *
 * It carries the traveler's name and the booking's facts only, nothing from
 * traveler_details, because inboxes forward and phones show previews.
 */

type Admin = SupabaseClient<Database>;

export async function sendNewBookingAlert(admin: Admin, bookingId: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_TO?.trim();
  if (!to) return;

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, status, total_amount, users(name, email), trips(name, start_date), tiers(name), payments(status, amount)")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) {
    console.error(`new-booking alert: could not read booking ${bookingId}${error ? ` (${error.code})` : ""}`);
    return;
  }

  const who = booking.users?.name?.trim() || booking.users?.email || "Someone";
  const trip = booking.trips ? `${booking.trips.name} (${booking.trips.start_date})` : "a trip";
  const tier = booking.tiers?.name ?? "no package";
  const paidCents = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + toCents(Number(p.amount)), 0);
  // At the first payment, paid_in_full can only mean the pay-in-full plan.
  const plan = booking.status === "paid_in_full" ? "paid in full" : "deposit";
  const amount = formatAmount(paidCents / 100);
  const confirmation = confirmationNumber(booking.id);
  const url = `${getAppUrl()}/admin/bookings/${booking.id}`;

  const line = `New booking: ${who}, ${trip}, ${tier}, ${plan} ${amount}, ${confirmation}`;

  await sendEmail({
    from: getFromAddress(),
    to,
    subject: `New booking: ${who}, ${tier} (${confirmation})`,
    text: `${line}\n\nTotal ${formatAmount(Number(booking.total_amount))}.\n\n${url}`,
    html: renderEmailLayout({
      preheader: line,
      bodyHtml: `<p style="margin:0 0 16px;">${escapeHtml(line)}</p><p style="margin:0;">Total ${escapeHtml(formatAmount(Number(booking.total_amount)))}.</p>`,
      ctaLabel: "Open the booking",
      footerNote: "You're receiving this because you're an Outrider admin.",
      ctaUrl: url,
    }),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
