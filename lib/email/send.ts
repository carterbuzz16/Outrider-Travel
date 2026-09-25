import "server-only";
import { Resend } from "resend";
import { renderEmailLayout, formatCurrency, formatDate } from "@/lib/email/layout";
// One implementation, shared with the Supabase auth redirects in
// app/auth/actions.ts — see lib/site-url.ts for the resolution order.
import { getAppUrl } from "@/lib/site-url";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import { waitlistWelcomeHtml } from "@/lib/email/templates/waitlist-welcome";
import { EARLY_ACCESS_SUBJECT, earlyAccessHtml } from "@/lib/email/templates/early-access";

// resend.emails.send() resolves with { data, error } rather than throwing
// on an API-level failure (e.g. an unverified domain) — it only throws on
// a network-level error. Without this wrapper, a real send failure would
// silently return undefined instead of surfacing anywhere, including
// through the sendEmailSafely try/catch in lib/payments.ts.
// Exported for lib/email/post-booking.ts, which sends the owner's templates.
export async function sendEmail(params: Parameters<Resend["emails"]["send"]>[0]) {
  const { data, error } = await getResend().emails.send(params);
  if (error) {
    throw new Error(`Resend send failed: ${error.name} — ${error.message}`);
  }
  return data;
}

/**
 * Up to 100 emails in one Resend call, for mail to the list. Same
 * error-surfacing as sendEmail. The idempotency key makes a retried call
 * (a double click, a timeout that actually went through) a no-op on
 * Resend's side for 24 hours rather than a second copy in everyone's inbox.
 */
export async function sendEmailBatch(
  emails: Parameters<Resend["batch"]["send"]>[0],
  idempotencyKey: string,
) {
  const { data, error } = await getResend().batch.send(emails, { idempotencyKey });
  if (error) {
    throw new Error(`Resend batch send failed: ${error.name} — ${error.message}`);
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
//
// Production sends as "Outrider <bookings@outrider.travel>": a real, watched
// inbox, because the emails promise a person answers. Never a noreply@
// address. Mail about a booking also sets reply-to to this same address (see
// sendBookingConfirmationEmail and lib/email/post-booking.ts), so a reply
// lands with a person even if a client ignores From for replies.
export function getFromAddress(): string {
  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error(
      "EMAIL_FROM_ADDRESS is not set. Verify a domain in Resend (Domains -> Add Domain) and set this to an address on it, e.g. 'Outrider <bookings@yourdomain.com>'."
    );
  }
  return process.env.EMAIL_FROM_ADDRESS;
}

/**
 * What every email in this folder renders to before it is sent. Each email has
 * a pure render function returning this, used by its real sender and by the
 * admin preview page (app/admin/emails), so what the back office previews and
 * test-sends is byte for byte what a traveler gets. Render functions never read
 * the database and never send.
 */
export type RenderedEmail = {
  subject: string;
  /** Absent for the plain-text-only notifications to the team. */
  html?: string;
  /** The plain-text part, where the real send includes one. */
  text?: string;
  /** Extra headers the real send carries (the waitlist's List-Unsubscribe). */
  headers?: Record<string, string>;
};

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

export type BookingConfirmationInput = {
  name: string | null;
  bookingId: string;
  trip: TripInfo;
  tierName: string;
  totalAmount: number;
  /** What the checkout charge took: the deposit, or the whole (discounted) price. */
  amountPaid: number;
  /** Paid in full at checkout: no schedule follows, and the copy says so. */
  paidInFull: boolean;
  groupCode: string | null;
  upcomingPayments: UpcomingPayment[];
  /**
   * The signed trip-page link (lib/portal-token.ts). This plain email is the
   * fallback for the designed one in lib/email/post-booking.ts, so when a link
   * can be made it still carries the three things we need straight away.
   */
  portalUrl?: string | null;
};

export async function sendBookingConfirmationEmail(opts: BookingConfirmationInput & { to: string }) {
  const { subject, html } = renderBookingConfirmationEmail(opts);
  await sendEmail({
    from: getFromAddress(),
    replyTo: getFromAddress(),
    to: opts.to,
    subject,
    html,
  });
}

export function renderBookingConfirmationEmail(opts: BookingConfirmationInput): RenderedEmail & { html: string } {
  const { name, bookingId, trip, tierName, totalAmount, amountPaid, paidInFull, groupCode, upcomingPayments, portalUrl } =
    opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const remaining = Math.max(0, totalAmount - amountPaid);

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
      : paidInFull
        ? `<p style="margin: 24px 0;">Your trip is paid in full. Nothing more to do on the payment side.</p>`
        : // No schedule rows yet (they can land a moment after this email is
          // built). Never "paid in full" unless the booking says so: state
          // what is still owed and that the dates follow.
          `<p style="margin: 24px 0 8px; font-weight: 600;">Remaining balance: ${formatCurrency(remaining)}</p>
    <p style="font-size: 13px; color: #6B7280;">We'll send your payment dates shortly. You'll also find them on your bookings page.</p>`;

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

  const portalHtml = portalUrl
    ? `
    <p style="margin: 24px 0 8px; font-weight: 600;">Three things to do now</p>
    <p>Book your flights, tell us who you are rooming with, and add your traveler details. All three are on your trip page: <a href="${escapeHtml(portalUrl)}">open your trip page</a>.</p>`
    : "";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>You're going to <strong>${escapeHtml(trip.name)}</strong>. ${paidInFull ? "Your payment" : "Your deposit"} is in and your spot is yours.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; font-size: 14px;">
      <tr><td style="padding: 4px 0; color: #6B7280; width: 140px;">Destination</td><td style="padding: 4px 0;">${escapeHtml(trip.destination)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">Dates</td><td style="padding: 4px 0;">${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">Package</td><td style="padding: 4px 0;">${escapeHtml(tierName)}</td></tr>
      <tr><td style="padding: 4px 0; color: #6B7280;">${paidInFull ? "Paid in full" : "Deposit paid"}</td><td style="padding: 4px 0;">${formatCurrency(amountPaid)}</td></tr>
    </table>
    ${portalHtml}
    ${scheduleHtml}
    ${logisticsHtml}
    ${groupCodeHtml}
  `;

  return {
    subject: `You're booked: ${trip.name}`,
    html: renderEmailLayout({
      eyebrow: trip.name,
      headline: paidInFull ? "You’re going. It’s paid." : "You’re going",
      preheader: paidInFull
        ? `Your payment for ${trip.name} is confirmed.`
        : `Your deposit for ${trip.name} is confirmed.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  };
}

export type InstallmentChargedInput = {
  name: string | null;
  bookingId: string;
  tripName: string;
  amount: number;
  remainingBalance: number;
  /**
   * `installment` is the cron's scheduled charge. `balance` is a payment the
   * traveler made themselves from the bookings page, which comes off the
   * scheduled ones, so the receipt says that instead of "as scheduled".
   */
  kind?: "installment" | "balance";
};

export async function sendInstallmentChargedEmail(opts: InstallmentChargedInput & { to: string }) {
  const { subject, html } = renderInstallmentChargedEmail(opts);
  await sendEmail({ from: getFromAddress(), to: opts.to, subject, html });
}

export function renderInstallmentChargedEmail(opts: InstallmentChargedInput): RenderedEmail & { html: string } {
  const { name, bookingId, tripName, amount, remainingBalance, kind = "installment" } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";

  const opening =
    kind === "balance"
      ? `We received your payment of <strong>${formatCurrency(amount)}</strong> toward your upcoming trip, <strong>${escapeHtml(tripName)}</strong>.`
      : `We charged <strong>${formatCurrency(amount)}</strong> toward your upcoming trip, <strong>${escapeHtml(tripName)}</strong>, as scheduled.`;

  const balanceLine =
    remainingBalance > 0
      ? kind === "balance"
        ? `Remaining balance: <strong>${formatCurrency(remainingBalance)}</strong>. We took this off your next scheduled payments, earliest first, and your bookings page shows the new amounts.`
        : `Remaining balance: <strong>${formatCurrency(remainingBalance)}</strong>.`
      : kind === "balance"
        ? `That covers the rest of the trip. You're paid in full, and no more payments will be taken.`
        : `That was your final payment. You're all paid up.`;

  const bodyHtml = `
    <p>${greeting}</p>
    <p>${opening}</p>
    <p>${balanceLine}</p>
  `;

  return {
    subject: `Payment received: ${tripName}`,
    html: renderEmailLayout({
      eyebrow: tripName,
      headline: "Payment received",
      // Neutral: a balance payment is one the traveler made themselves.
      preheader: `Payment of ${formatCurrency(amount)} received for ${tripName}.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  };
}

export type PaymentFailedInput = {
  name: string | null;
  bookingId: string;
  tripName: string;
  amount: number;
  willRetry: boolean;
};

export async function sendPaymentFailedEmail(opts: PaymentFailedInput & { to: string }) {
  const { subject, html } = renderPaymentFailedEmail(opts);
  await sendEmail({ from: getFromAddress(), to: opts.to, subject, html });
}

export function renderPaymentFailedEmail(opts: PaymentFailedInput): RenderedEmail & { html: string } {
  const { name, bookingId, tripName, amount, willRetry } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>We tried to charge <strong>${formatCurrency(amount)}</strong> for your upcoming trip, <strong>${escapeHtml(tripName)}</strong>, but the payment didn't go through.</p>
    <p>${
      willRetry
        ? "We'll automatically try again in a few days. If your card has expired or changed, please reach out so we can update it before then."
        : "We've tried a couple of times now without success. Please reach out so we can sort out payment directly rather than risk another failed attempt."
    }</p>
  `;

  return {
    subject: `Action needed: payment failed for ${tripName}`,
    html: renderEmailLayout({
      eyebrow: tripName,
      headline: "That payment didn’t go through",
      preheader: `We couldn't process your ${formatCurrency(amount)} installment.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  };
}

export type ActionRequiredInput = {
  name: string | null;
  bookingId: string;
  paymentId: string;
  tripName: string;
  amount: number;
};

export async function sendActionRequiredEmail(opts: ActionRequiredInput & { to: string }) {
  const { subject, html } = renderActionRequiredEmail(opts);
  await sendEmail({ from: getFromAddress(), to: opts.to, subject, html });
}

export function renderActionRequiredEmail(opts: ActionRequiredInput): RenderedEmail & { html: string } {
  const { name, bookingId, paymentId, tripName, amount } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Your bank needs you to verify your upcoming <strong>${formatCurrency(amount)}</strong> payment for <strong>${escapeHtml(tripName)}</strong> before we can complete it. This is a routine extra security step some banks require, not a decline.</p>
    <p>Nothing will be charged until you complete verification.</p>
  `;

  return {
    subject: `Action needed: verify your payment for ${tripName}`,
    html: renderEmailLayout({
      eyebrow: tripName,
      headline: "Your bank needs a yes",
      preheader: `Your bank needs to verify a ${formatCurrency(amount)} payment.`,
      bodyHtml,
      ctaLabel: "Verify now",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/installments/${paymentId}`,
    }),
  };
}

/**
 * Sent when lib/overpayment.ts refunds money on its own: a payment took the
 * booking past its price, or arrived on a booking that was already cancelled.
 * Nobody at Outrider decided this refund, so the email is the only way the
 * traveler hears why a credit is on its way. Kept short and factual.
 */
export type OverpaymentRefundInput = {
  name: string | null;
  bookingId: string;
  tripName: string;
  amount: number;
  reason: "overpaid" | "cancelled";
};

export async function sendOverpaymentRefundEmail(opts: OverpaymentRefundInput & { to: string }) {
  const { subject, html } = renderOverpaymentRefundEmail(opts);
  await sendEmail({ from: getFromAddress(), to: opts.to, subject, html });
}

export function renderOverpaymentRefundEmail(opts: OverpaymentRefundInput): RenderedEmail & { html: string } {
  const { name, bookingId, tripName, amount, reason } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";

  const why =
    reason === "overpaid"
      ? `A recent payment took your booking for <strong>${escapeHtml(tripName)}</strong> past its price, so we have refunded the difference.`
      : `A payment reached your booking for <strong>${escapeHtml(tripName)}</strong> after it was canceled, so we've refunded it.`;

  const bodyHtml = `
    <p>${greeting}</p>
    <p>${why}</p>
    <p>Refund: <strong>${formatCurrency(amount)}</strong>, back to the card you paid with. Banks usually take 5 to 10 business days to show it.</p>
    <p>There is nothing you need to do. If the numbers look wrong to you, reply to this email.</p>
  `;

  return {
    subject: `Refund on its way: ${tripName}`,
    html: renderEmailLayout({
      eyebrow: tripName,
      headline: "Refund on its way",
      preheader: `We refunded ${formatCurrency(amount)} to your card.`,
      bodyHtml,
      ctaLabel: "View your booking",
      ctaUrl: `${getAppUrl()}/bookings/${bookingId}/confirmation`,
    }),
  };
}

/**
 * Welcome mail, sent to the person who joined.
 *
 * This is the message that carries the unsubscribe link, which is why it
 * matters more than a courtesy. The privacy policy promises "use the
 * unsubscribe link in any of those messages", and until this existed the first
 * message anyone received was going to be a bulk announcement, so there was no
 * link to use. Gmail and Yahoo also require List-Unsubscribe with one-click
 * support from bulk senders, and a domain whose first send is a cold blast to
 * hundreds of addresses is a domain that lands in spam. A welcome people open
 * is what teaches inboxes otherwise.
 */
export async function sendWaitlistWelcome(email: string, token: string) {
  const { subject, html, text, headers } = renderWaitlistWelcome(token);
  await sendEmail({ from: getFromAddress(), to: email, subject, headers, html, text });
}

export function renderWaitlistWelcome(token: string): RenderedEmail & { html: string; text: string } {
  const url = `${getAppUrl()}/unsubscribe?t=${encodeURIComponent(token)}`;
  // Before launch the list hears first; once booking is open there is no
  // "before it goes on sale" left to promise.
  const waitlistOpening = BOOKINGS_OPEN
    ? "Telluride is open for booking now, and the list hears first whenever the next trip opens."
    : "Trips open to this list before they go on sale. When Telluride goes live, you'll hear it from us before campus does.";

  return {
    subject: "You're on the Outrider list",
    headers: {
      // RFC 8058. The POST endpoint is what Gmail's own unsubscribe button
      // calls, without the reader ever leaving their inbox.
      "List-Unsubscribe": `<${getAppUrl()}/api/unsubscribe?t=${encodeURIComponent(token)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    // The branded Ski Club version, built on the owner's email shell. See
    // lib/email/templates/waitlist-welcome.ts.
    html: waitlistWelcomeHtml({
      origin: getAppUrl().replace(/\/+$/, ""),
      unsubscribeUrl: escapeHtml(url),
      bookingsOpen: BOOKINGS_OPEN,
      addressLine: escapeHtml([LEGAL_NAME, ...(CONTACT.postalAddress ?? [])].join(", ")),
      preheader: BOOKINGS_OPEN
        ? "You're on the list. Telluride is open, and the next trip comes to you first."
        : "First dibs on Telluride. The list hears before anyone else.",
    }),
    text: [
      "You're on the list.",
      "",
      waitlistOpening,
      "",
      "Telluride: December 14-18, 2026 or January 4-8, 2027",
      "The Peaks, Mountain Village. Four to a room, two to a room, or a whole penthouse for your eight.",
      "Included: lift tickets and ski or snowboard rentals, rides from Montrose, an après party at Gorrono Ranch, and our team on the ground all week.",
      "",
      `See the trip: ${getAppUrl().replace(/\/+$/, "")}/telluride`,
      "",
      "Send this to the friends you'd go with. Book with the same group code and you're placed together.",
      "",
      "Questions: bookings@outrider.travel. We reply within a day.",
      "We only email when a trip opens.",
      `Unsubscribe: ${url}`,
    ].join("\n"),
  };
}

/**
 * The list's head start (lib/early-access.ts): booking is open to them first.
 * `bookingUrl` is the member's own /early-access link; `unsubscribeToken` is
 * their unsubscribe_token, the same one the welcome carries.
 */
export function renderEarlyAccess(opts: {
  bookingUrl: string;
  unsubscribeToken: string;
  fromPrice: string | null;
}): RenderedEmail & { html: string; text: string } {
  const origin = getAppUrl().replace(/\/+$/, "");
  const unsubscribeUrl = `${origin}/unsubscribe?t=${encodeURIComponent(opts.unsubscribeToken)}`;

  return {
    subject: EARLY_ACCESS_SUBJECT,
    headers: {
      "List-Unsubscribe": `<${origin}/api/unsubscribe?t=${encodeURIComponent(opts.unsubscribeToken)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: earlyAccessHtml({
      origin,
      bookingUrl: escapeHtml(opts.bookingUrl),
      unsubscribeUrl: escapeHtml(unsubscribeUrl),
      addressLine: escapeHtml([LEGAL_NAME, ...(CONTACT.postalAddress ?? [])].join(", ")),
      fromPrice: opts.fromPrice ? escapeHtml(opts.fromPrice) : null,
    }),
    text: [
      "You're in before anyone.",
      "",
      "Booking for Telluride is open, to this list and nobody else yet. First pick of the dates and the rooms, the two penthouses included.",
      "",
      `Book your spot: ${opts.bookingUrl}`,
      "",
      "Telluride: December 14-18, 2026 or January 4-8, 2027",
      "The Peaks, Mountain Village. Four to a room, two to a room, or a whole penthouse for your eight.",
      opts.fromPrice ? `From ${opts.fromPrice} per person, all in.` : "One price per person, all in.",
      "10% down holds your spot. The rest comes in two installments, or pay it all at once.",
      "",
      "Forward this to the friends you're rooming with. The link works for them too, so you can all book before it opens to everyone.",
      "",
      `Questions: ${CONTACT.email}. We reply within a day.`,
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n"),
  };
}

// Optional heads-up to the team when someone joins the waitlist. Silent
// no-op unless WAITLIST_NOTIFY_TO is set, so the coming-soon page works
// without it; the caller treats any failure here as non-fatal.
export type WaitlistSignupContext = {
  /** "First Last", from the form. */
  name?: string;
  placement?: string;
  /** The ?src= tag on a handed-out link, e.g. "launch" for an event QR code. */
  src?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
};

export async function sendWaitlistNotification(email: string, context: WaitlistSignupContext = {}) {
  const to = process.env.WAITLIST_NOTIFY_TO;
  if (!to) return;

  const { subject, text } = renderWaitlistNotification(email, context);
  await sendEmail({ from: getFromAddress(), to, subject, text });
}

export function renderWaitlistNotification(
  email: string,
  context: WaitlistSignupContext = {},
): RenderedEmail & { text: string } {
  // Plain text, one fact per line, so it can be skimmed from a phone lock
  // screen. Lines with nothing to say are left out rather than printed empty.
  const lines = [
    context.name,
    email,
    context.src && `Tag: ${context.src}`,
    context.placement && `Form: ${context.placement}`,
    context.source && `Source: ${context.source}`,
    context.medium && `Medium: ${context.medium}`,
    context.campaign && `Campaign: ${context.campaign}`,
    context.referrer && `Referrer: ${context.referrer}`,
  ].filter(Boolean);

  return {
    subject: context.src || context.source
      ? `Outrider: new waitlist signup (${context.src || context.source})`
      : "Outrider: new waitlist signup",
    text: lines.join("\n"),
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
