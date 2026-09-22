import "server-only";
import { formatCurrency, renderEmailLayout } from "@/lib/email/layout";
import { getFromAddress, sendEmail, type RenderedEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";

/**
 * Sent when a checkout left open past its 30-minute hold was paid after its
 * place had gone (lib/payments.ts, settleStaleCheckout): the payment has been
 * refunded in full and the booking cancelled. Nobody at Outrider decided
 * this, so the email is the only way the traveler hears why. Short, and it
 * says sorry. In its own file so it lands without touching lib/email/send.ts.
 */
export type StaleCheckoutRefundInput = {
  name: string | null;
  tripId: string;
  tripName: string;
  amount: number;
  reason: "full" | "claimed";
};

export async function sendStaleCheckoutRefundEmail(opts: StaleCheckoutRefundInput & { to: string }) {
  const { subject, html } = renderStaleCheckoutRefundEmail(opts);
  await sendEmail({ from: getFromAddress(), to: opts.to, subject, html });
}

/** The apology's content. Pure. */
export function renderStaleCheckoutRefundEmail(opts: StaleCheckoutRefundInput): RenderedEmail & { html: string } {
  const { name, tripId, tripName, amount, reason } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const why =
    reason === "claimed"
      ? "another group booked the penthouse while your checkout was open"
      : "the last place in that package was taken while your checkout was open";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>We're sorry. Your payment for <strong>${escapeHtml(tripName)}</strong> came through after your checkout had been open for more than 30 minutes, and in that time ${why}. So we couldn't hold the place for you.</p>
    <p>We've refunded the full <strong>${formatCurrency(amount)}</strong> to the card you paid with. Banks usually take 5 to 10 business days to show it. The booking has been canceled, and nothing more will be taken.</p>
    <p>If other dates or packages still suit you, you can choose again below. If anything looks wrong, reply to this email.</p>
  `;

  return {
    subject: `Refund on its way: ${tripName}`,
    html: renderEmailLayout({
      eyebrow: tripName,
      headline: "Refund on its way",
      preheader: `We refunded ${formatCurrency(amount)} to your card.`,
      bodyHtml,
      ctaLabel: "Choose again",
      ctaUrl: `${getAppUrl()}/bookings/new?trip=${encodeURIComponent(tripId)}`,
      footerNote: "You're receiving this because you started a booking with Outrider. Questions? Just reply to this email.",
    }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
