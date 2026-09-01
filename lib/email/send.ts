import { Resend } from "resend";
import { renderEmailLayout, formatCurrency, formatDate } from "@/lib/email/layout";

// resend.emails.send() resolves with { data, error } rather than throwing
// on an API-level failure (e.g. an unverified domain) — it only throws on
// a network-level error. Without this wrapper, a real send failure would
// silently return undefined instead of surfacing anywhere, including
// through the sendEmailSafely try/catch in lib/payments.ts.
async function sendEmail(params: Parameters<Resend["emails"]["send"]>[0]) {
  const { data, error } = await getResend().emails.send(params);
  if (error) {
    throw new Error(`Resend send failed: ${error.name} — ${error.message}`);
  }
  return data;
}

let resendInstance: Resend | undefined;

// Lazily constructed, same reasoning as lib/stripe.ts: a missing
// RESEND_API_KEY should only break the specific send that needs it, not
// `next build`'s static page-data collection.
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Resend requires a verified sending domain — there's no zero-setup
// sandbox sender anymore. EMAIL_FROM_ADDRESS must use a domain verified in
// Resend's dashboard (Domains -> Add Domain), or every send fails with a
// "domain is invalid" 422.
function getFromAddress(): string {
  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error(
      "EMAIL_FROM_ADDRESS is not set. Verify a domain in Resend (Domains -> Add Domain) and set this to an address on it, e.g. 'Outrider <bookings@yourdomain.com>'."
    );
  }
  return process.env.EMAIL_FROM_ADDRESS;
}

// VERCEL_URL has no protocol and is only set on Vercel; NEXT_PUBLIC_APP_URL
// is the explicit override for a custom domain.
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

interface TripInfo {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  logistics: string | null;
}

interface UpcomingPayment {
  amount: number;
  scheduledDate: string | null;
}

export async function sendBookingConfirmationEmail(opts: {
  to: string;
  name: string | null;
  bookingId: string;
  trip: TripInfo;
  tierName: string;
  totalAmount: number;
  depositAmount: number;
  groupCode: string | null;
  upcomingPayments: UpcomingPayment[];
}) {
  const { to, name, bookingId, trip, tierName, totalAmount, depositAmount, groupCode, upcomingPayments } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const remaining = totalAmount - depositAmount;

  const scheduleHtml =
    upcomingPayments.length > 0
      ? `
    <p style="margin: 24px 0 8px; font-weight: 600;">Remaining balance: ${formatCurrency(remaining)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
      ${upcomingPayments
        .map(
          (p) => `
      <tr>
        <td style="padding: 4px 0; color: #6B7280;">${p.scheduledDate ? formatDate(p.scheduledDate) : "Date TBD"}</td>
        <td style="padding: 4px 0; text-align: right;">${formatCurrency(p.amount)}</td>
      </tr>`
        )
        .join("")}
    </table>
    <p style="font-size: 13px; color: #6B7280;">These will be charged automatically to the card you used today.</p>`
      : `<p style="margin: 24px 0;">Your trip is paid in full — nothing more to do on the payment side.</p>`;

  const logisticsHtml = trip.logistics
    ? `
    <p style="margin: 24px 0 8px; font-weight: 600;">Getting there</p>
    <p style="white-space: pre-wrap;">${escapeHtml(trip.logistics)}</p>`
    : "";

  const groupCodeHtml = groupCode
    ? `
    <p style="margin: 24px 0 8px; font-weight: 600;">Traveling with friends?</p>
    <p>Share your group code so we know to room you together: <strong style="letter-spacing: 2px;">${escapeHtml(groupCode)}</strong></p>`
    : "";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Your deposit is confirmed for <strong>${escapeHtml(trip.name)}</strong> — you're booked in.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; font-size: 14px;">
      <tr><td style="padding: 4px 0; color: #6B7280; width: 140px;">Destination</td><td style="padding: 4px 0;">${escapeHtml(trip.destination)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">Dates</td><td style="padding: 4px 0;">${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">Package</td><td style="padding: 4px 0;">${escapeHtml(tierName)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">Deposit paid</td><td style="padding: 4px 0;">${formatCurrency(depositAmount)}</td></tr>
    </table>
    ${scheduleHtml}
    ${logisticsHtml}
    ${groupCodeHtml}
  `;

  await sendEmail({
    from: getFromAddress(),
    to,
    subject: `You're booked: ${trip.name}`,
    html: renderEmailLayout({
      preheader: `Your deposit for ${trip.name} is confirmed.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  });
}

export async function sendInstallmentChargedEmail(opts: {
  to: string;
  name: string | null;
  bookingId: string;
  tripName: string;
  amount: number;
  remainingBalance: number;
}) {
  const { to, name, bookingId, tripName, amount, remainingBalance } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>We charged <strong>${formatCurrency(amount)}</strong> toward your upcoming trip, <strong>${escapeHtml(tripName)}</strong>, as scheduled.</p>
    <p>${
      remainingBalance > 0
        ? `Remaining balance: <strong>${formatCurrency(remainingBalance)}</strong>.`
        : `That was your final payment — you're all paid up!`
    }</p>
  `;

  await sendEmail({
    from: getFromAddress(),
    to,
    subject: `Payment received: ${tripName}`,
    html: renderEmailLayout({
      preheader: `We charged ${formatCurrency(amount)} for ${tripName}.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  });
}

export async function sendPaymentFailedEmail(opts: {
  to: string;
  name: string | null;
  bookingId: string;
  tripName: string;
  amount: number;
  willRetry: boolean;
}) {
  const { to, name, bookingId, tripName, amount, willRetry } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>We tried to charge <strong>${formatCurrency(amount)}</strong> for your upcoming trip, <strong>${escapeHtml(tripName)}</strong>, but the payment didn't go through.</p>
    <p>${
      willRetry
        ? "We'll automatically try again in a few days. If your card has expired or changed, please reach out so we can update it before then."
        : "We've tried a couple of times now without success — please reach out so we can sort out payment directly rather than risk another failed attempt."
    }</p>
  `;

  await sendEmail({
    from: getFromAddress(),
    to,
    subject: `Action needed: payment failed for ${tripName}`,
    html: renderEmailLayout({
      preheader: `We couldn't process your ${formatCurrency(amount)} installment.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  });
}

export async function sendActionRequiredEmail(opts: {
  to: string;
  name: string | null;
  bookingId: string;
  paymentId: string;
  tripName: string;
  amount: number;
}) {
  const { to, name, bookingId, paymentId, tripName, amount } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Your bank needs you to verify your upcoming <strong>${formatCurrency(amount)}</strong> payment for <strong>${escapeHtml(tripName)}</strong> before we can complete it — this is a routine extra security step some banks require, not a decline.</p>
    <p>Nothing will be charged until you complete verification.</p>
  `;

  await sendEmail({
    from: getFromAddress(),
    to,
    subject: `Action needed: verify your payment for ${tripName}`,
    html: renderEmailLayout({
      preheader: `Your bank needs to verify a ${formatCurrency(amount)} payment.`,
      bodyHtml,
      ctaLabel: "Verify now",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/installments/${paymentId}`,
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
