import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  renderActionRequiredEmail,
  renderInstallmentChargedEmail,
  renderOverpaymentRefundEmail,
  renderPaymentFailedEmail,
  renderEarlyAccess,
  renderWaitlistNotification,
  renderWaitlistWelcome,
  type RenderedEmail,
} from "@/lib/email/send";
import {
  buildTemplateVariables,
  renderChaseEmail,
  renderConfirmationEmail,
  renderPlainConfirmationFor,
  smsNumbers,
  type BookingForEmail,
  type ChaseFlags,
} from "@/lib/email/post-booking";
import { renderPenthouseFullEmail, renderPenthouseReminderEmail } from "@/lib/email/penthouse";
import { renderNewBookingAlert } from "@/lib/email/admin-alerts";
import { renderPortalLinkEmail } from "@/lib/email/portal-link";
import { renderStaleCheckoutRefundEmail } from "@/lib/email/stale-checkout";
import { renderContactMessage } from "@/lib/email/contact";
import { TemplateRenderError } from "@/lib/email/render-template";
import { createPortalUrl } from "@/lib/portal-token";
import { getAppUrl } from "@/lib/site-url";

/*
 * Every email the site sends, for the back office's preview page
 * (app/admin/emails).
 *
 * Each entry renders through the same pure function its real sender uses, fed
 * with the SAMPLE booking below instead of a row from the database. Nothing
 * here reads or writes the database, mints a claim or sends anything; the test
 * send in app/admin/emails/actions.ts is the only caller that sends, and only
 * to the signed-in admin.
 *
 * When a new email is added under lib/email, add it here too, or the owner has
 * no way to see it before a traveler does.
 */

/* -- the sample booking ------------------------------------------------------ */

// Fixed, obviously fake ids. A link in a test email that uses one opens a
// "this link doesn't open a trip" page rather than anybody's booking.
const SAMPLE_BOOKING_ID = "5f2c9e71-3a8d-4b6e-9c14-7d0e2a6b8f39";
/** The head-start email's "From" line in preview; the real send reads the published trips. */
const SAMPLE_FROM_PRICE = "$1,600";
const SAMPLE_TRIP_ID = "b1e7d2c4-6a3f-4e58-8d21-0c9f7a5e3b16";
const SAMPLE_PENTHOUSE_TIER_ID = "c8a41f6e-2d7b-4c93-a5e0-9b3d6f1e7a24";
const SAMPLE_PAYMENT_ID = "e4b92d17-8c5a-4f36-b0e1-6a7d3c9f2e58";
const SAMPLE_EMAIL = "jordan.taylor@example.com";
const SAMPLE_NAME = "Jordan Taylor";
const SAMPLE_FIRST_NAME = "Jordan";
const SAMPLE_GROUP_CODE = "TAYLOR";

// A real portal link carries a signed token. The preview never mints one for
// the fake booking: it is a placeholder of the same shape.
const SAMPLE_PORTAL_URL = `${getAppUrl()}/trip/${SAMPLE_BOOKING_ID}?t=sample-preview-link`;

const SAMPLE_TRIP = {
  name: "Telluride",
  destination: "Telluride, Colorado",
  // The real December departure, so the designed emails read its actual
  // logistics from lib/trip-logistics.ts, gaps and all.
  start_date: "2026-12-14",
  end_date: "2026-12-18",
  logistics: null,
};

// "Two to a Room" at $2,299: a 10% deposit today, the rest in two installments.
const SAMPLE_BOOKING: BookingForEmail = {
  id: SAMPLE_BOOKING_ID,
  user_id: "sample-user",
  trip_id: SAMPLE_TRIP_ID,
  status: "deposit_paid",
  total_amount: 2299,
  group_code: SAMPLE_GROUP_CODE,
  flights_booked: true,
  rooming_submitted: false,
  details_submitted: false,
  confirmation_email_sent_at: null,
  chase_email_sent_at: null,
  users: { email: SAMPLE_EMAIL, name: SAMPLE_NAME },
  trips: SAMPLE_TRIP,
  tiers: { name: "MID" },
  payments: [
    { status: "succeeded", amount: 229.9, scheduled_date: null },
    { status: "scheduled", amount: 1034.55, scheduled_date: "2026-10-15" },
    { status: "scheduled", amount: 1034.55, scheduled_date: "2026-11-15" },
  ],
};

// Flights done, the other two still open: the chase lists two things.
const SAMPLE_CHASE_FLAGS: ChaseFlags = {
  flights_booked: SAMPLE_BOOKING.flights_booked,
  rooming_submitted: SAMPLE_BOOKING.rooming_submitted,
  details_submitted: SAMPLE_BOOKING.details_submitted,
};

const SAMPLE_PENTHOUSE_TIER = {
  id: SAMPLE_PENTHOUSE_TIER_ID,
  name: "PENTHOUSE 702",
  trip_id: SAMPLE_TRIP_ID,
  trips: { name: SAMPLE_TRIP.name, start_date: SAMPLE_TRIP.start_date, end_date: SAMPLE_TRIP.end_date },
};

/* -- the designed templates: what production is still missing ---------------- */

const GAP_LABELS: Record<string, string> = {
  trip_capacity: "Trip capacity (lib/trip-logistics.ts)",
  property_name: "Property name (lib/trip-logistics.ts)",
  rooming_lock_date: "Date rooming requests close (lib/trip-logistics.ts)",
  sms_number: "Texting number (SMS_NUMBER and SMS_NUMBER_RAW settings)",
  sms_number_raw: "Texting number (SMS_NUMBER and SMS_NUMBER_RAW settings)",
  portal_url: "Trip page links (PORTAL_TOKEN_SECRET setting)",
  rooming_url: "Trip page links (PORTAL_TOKEN_SECRET setting)",
  traveler_details_url: "Trip page links (PORTAL_TOKEN_SECRET setting)",
  postal_address: "Postal address (lib/site-content.ts)",
};

function designedVariables(placeholders: boolean) {
  return buildTemplateVariables(SAMPLE_BOOKING, {
    firstName: SAMPLE_FIRST_NAME,
    // For the gap check, whether this environment could sign a real link; the
    // token itself is thrown away.
    portalUrl: placeholders || createPortalUrl(SAMPLE_BOOKING_ID) ? SAMPLE_PORTAL_URL : null,
    sms: smsNumbers(),
    placeholders,
  });
}

/**
 * What the designed template would refuse over on production, where no
 * "[… to be confirmed]" stand-in is allowed: the same render, with stand-ins
 * off. Settings are read from this environment, which may differ from
 * production's.
 */
function productionGaps(render: (variables: ReturnType<typeof designedVariables>) => unknown): string[] {
  try {
    render(designedVariables(false));
    return [];
  } catch (err) {
    if (!(err instanceof TemplateRenderError)) throw err;
    const names = err.missing.length > 0 ? err.missing : [err.message];
    return [...new Set(names.map((name) => GAP_LABELS[name] ?? name))];
  }
}

/* -- Supabase's auth templates ----------------------------------------------- */

/**
 * The HTML in supabase/email-templates, with Supabase's two variables filled
 * with stand-ins. Read from disk (traced into the route by next.config.mjs);
 * a missing file previews as a note rather than breaking the page.
 */
function supabaseTemplate(file: string): string {
  const raw = readFileSync(path.join(process.cwd(), "supabase", "email-templates", file), "utf8");
  return raw
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, getAppUrl())
    .replace(/\{\{\s*\.TokenHash\s*\}\}/g, "sample-token-hash");
}

/* -- the catalogue ----------------------------------------------------------- */

const CRON_ONLY_16 = "Sent by the daily 16:00 UTC email job; use Send test.";
const CRON_ONLY_13 = "Follows the daily 13:00 UTC installment charge; use Send test.";
const SANDBOX_BOOK = "Book any package in the sandbox and pay with 4242 4242 4242 4242 (any future date, any CVC).";
const TRAVELER = "The traveler who booked";

export type EmailEntry = {
  id: string;
  section: string;
  name: string;
  /** When it fires, in plain English. */
  trigger: string;
  recipient: string;
  /** How to make it fire for real in the sandbox, or null where it can't be. */
  sandbox: string | null;
  /** Sent by Supabase from its dashboard copy, not by this app. No test send. */
  supabase?: boolean;
  /** Reply-to on the real send: the bookings inbox. */
  replyToBookings?: boolean;
  notes?: string[];
  /**
   * Designed templates only: the real values production still lacks (so it
   * cannot send this one yet), and what it does instead.
   */
  gaps?: { missing: string[]; consequence: string };
  render: () => RenderedEmail;
};

export function emailCatalog(): EmailEntry[] {
  const confirmationGaps = productionGaps((v) => renderConfirmationEmail(v, false));
  const chaseGaps = productionGaps((v) => renderChaseEmail(v, SAMPLE_CHASE_FLAGS, SAMPLE_FIRST_NAME));
  const adminNotify = process.env.ADMIN_NOTIFY_TO?.trim() ? "set" : "not set";
  const waitlistNotify = process.env.WAITLIST_NOTIFY_TO ? "set" : "not set";

  return [
    /* -- after booking ------------------------------------------------------ */
    {
      id: "confirmation-designed",
      section: "After booking",
      name: "Booking confirmation (designed)",
      trigger:
        "When a booking's first payment (the deposit or the full price) clears. Once per booking. If the send fails, the daily 16:00 UTC job retries it for up to three days.",
      recipient: TRAVELER,
      sandbox: SANDBOX_BOOK,
      replyToBookings: true,
      notes: [
        "Previewed with \"[… to be confirmed]\" stand-ins where a trip fact is still blank, exactly as the sandbox sends it.",
      ],
      gaps: {
        missing: confirmationGaps,
        consequence: "Until these are filled in, production sends the plain fallback (below) instead of this one.",
      },
      render: () => renderConfirmationEmail(designedVariables(true), false),
    },
    {
      id: "confirmation-plain",
      section: "After booking",
      name: "Booking confirmation (plain fallback)",
      trigger:
        "Same moment as the designed confirmation, sent in its place whenever the designed one can't be filled in completely. Only one of the two ever goes to a booking.",
      recipient: TRAVELER,
      sandbox:
        "The sandbox sends the designed one instead (stand-ins fill its gaps), so use Send test.",
      replyToBookings: true,
      notes:
        confirmationGaps.length > 0
          ? ["This is what production travelers get today, until the designed confirmation's missing values are filled in."]
          : undefined,
      render: () => renderPlainConfirmationFor(SAMPLE_BOOKING, SAMPLE_PORTAL_URL),
    },
    {
      id: "chase",
      section: "After booking",
      name: "72-hour reminder (flights, roommates, details)",
      trigger:
        "72 hours after the confirmation, if the traveler still hasn't done all three: flights, rooming, traveler details. Once per booking, never once the trip has started. Lists only what's still open.",
      recipient: TRAVELER,
      sandbox: CRON_ONLY_16,
      replyToBookings: true,
      notes: [
        "Sample: flights done, rooming and details still open.",
      ],
      gaps: {
        missing: chaseGaps,
        consequence: "This one has no fallback: until these are filled in, production skips it and tries again the next day.",
      },
      render: () => renderChaseEmail(designedVariables(true), SAMPLE_CHASE_FLAGS, SAMPLE_FIRST_NAME),
    },
    {
      id: "new-booking-alert",
      section: "After booking",
      name: "New booking alert",
      trigger: "Right after a booking's confirmation goes out, so once per booking.",
      recipient: `The team, at the ADMIN_NOTIFY_TO address (${adminNotify} in this environment; nothing is sent while it's blank)`,
      sandbox: SANDBOX_BOOK,
      notes: ["Uses the working package names (MID, BASE), as the rest of the back office does."],
      render: () =>
        renderNewBookingAlert({
          id: SAMPLE_BOOKING.id,
          status: SAMPLE_BOOKING.status,
          total_amount: SAMPLE_BOOKING.total_amount,
          users: SAMPLE_BOOKING.users,
          trips: { name: SAMPLE_TRIP.name, start_date: SAMPLE_TRIP.start_date },
          tiers: SAMPLE_BOOKING.tiers,
          payments: SAMPLE_BOOKING.payments,
        }),
    },

    /* -- penthouse ---------------------------------------------------------- */
    {
      id: "penthouse-full",
      section: "Penthouse",
      name: "Penthouse full",
      trigger:
        "The moment the last place in a penthouse is paid for. Once per person. The daily 16:00 UTC job is the backstop if that send fails.",
      recipient: "Every member of the group who has paid",
      sandbox: "Needs every place in a penthouse paid by one group; use Send test.",
      replyToBookings: true,
      notes: ["Sample: Penthouse 702, all 8 places paid."],
      render: () =>
        renderPenthouseFullEmail({
          memberName: SAMPLE_NAME,
          tier: SAMPLE_PENTHOUSE_TIER,
          fill: { capacity: 8 },
          portalUrl: SAMPLE_PORTAL_URL,
        }),
    },
    {
      id: "penthouse-reminder",
      section: "Penthouse",
      name: "Penthouse: two days left",
      trigger:
        "When a penthouse's 7-day fill window has 48 hours or less to go and places are still open. Once per person.",
      recipient: "Every member of the group who has paid",
      sandbox: CRON_ONLY_16,
      replyToBookings: true,
      notes: [`Sample: Penthouse 702, 5 of 8 in, group code ${SAMPLE_GROUP_CODE}.`],
      render: () =>
        renderPenthouseReminderEmail({
          memberName: SAMPLE_NAME,
          tier: SAMPLE_PENTHOUSE_TIER,
          code: SAMPLE_GROUP_CODE,
          fill: { capacity: 8, filled: 5 },
        }),
    },

    /* -- payments ----------------------------------------------------------- */
    {
      id: "installment-receipt",
      section: "Payments",
      name: "Installment receipt",
      trigger: "When a scheduled installment is charged and clears. One per payment.",
      recipient: TRAVELER,
      sandbox: CRON_ONLY_13,
      notes: ["Sample: the first $1,034.55 installment, $1,034.55 left."],
      render: () =>
        renderInstallmentChargedEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 1034.55,
          remainingBalance: 1034.55,
        }),
    },
    {
      id: "balance-receipt",
      section: "Payments",
      name: "Balance payment receipt",
      trigger:
        "When a traveler pays some or all of their balance early from their bookings page (Pay ahead) and it clears. One per payment.",
      recipient: TRAVELER,
      sandbox: "On a sandbox booking, open Bookings, choose Pay ahead and pay with 4242 4242 4242 4242.",
      notes: ["Sample: $500 paid ahead, $1,569.10 left."],
      render: () =>
        renderInstallmentChargedEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 500,
          remainingBalance: 1569.1,
          kind: "balance",
        }),
    },
    {
      id: "payment-failed-retry",
      section: "Payments",
      name: "Payment failed (we'll retry)",
      trigger: "When a scheduled installment is declined on its first attempt. We try again automatically.",
      recipient: TRAVELER,
      sandbox: CRON_ONLY_13,
      render: () =>
        renderPaymentFailedEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 1034.55,
          willRetry: true,
        }),
    },
    {
      id: "payment-failed-final",
      section: "Payments",
      name: "Payment failed (no more retries)",
      trigger:
        "When an installment is declined on its last attempt, or can't be charged at all (no usable card on file). It then shows under Flagged payments.",
      recipient: TRAVELER,
      sandbox: CRON_ONLY_13,
      render: () =>
        renderPaymentFailedEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 1034.55,
          willRetry: false,
        }),
    },
    {
      id: "action-required",
      section: "Payments",
      name: "Verify your payment (3-D Secure)",
      trigger:
        "When the traveler's bank asks them to approve a scheduled installment before it can go through. Nothing is charged until they do.",
      recipient: TRAVELER,
      sandbox: CRON_ONLY_13,
      render: () =>
        renderActionRequiredEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          paymentId: SAMPLE_PAYMENT_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 1034.55,
        }),
    },

    /* -- automatic refunds -------------------------------------------------- */
    {
      id: "refund-overpaid",
      section: "Automatic refunds",
      name: "Refund: paid more than the price",
      trigger: "When a payment takes a booking past its price. The extra is refunded automatically, once per payment.",
      recipient: TRAVELER,
      sandbox: "Hard to cause on purpose; use Send test.",
      render: () =>
        renderOverpaymentRefundEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 25,
          reason: "overpaid",
        }),
    },
    {
      id: "refund-after-cancel",
      section: "Automatic refunds",
      name: "Refund: payment after cancellation",
      trigger: "When a payment lands on a booking that was already canceled. It's refunded automatically.",
      recipient: TRAVELER,
      sandbox: "Hard to cause on purpose; use Send test.",
      render: () =>
        renderOverpaymentRefundEmail({
          name: SAMPLE_NAME,
          bookingId: SAMPLE_BOOKING_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 1034.55,
          reason: "cancelled",
        }),
    },
    {
      id: "stale-checkout-full",
      section: "Automatic refunds",
      name: "Sorry: package filled during checkout",
      trigger:
        "When someone pays after their 30-minute checkout hold ran out and the last place in that package went in the meantime. Full refund, booking canceled.",
      recipient: "The person who paid",
      sandbox:
        "Start a checkout, wait over 30 minutes while someone else takes the last place, then pay. Easier to use Send test.",
      render: () =>
        renderStaleCheckoutRefundEmail({
          name: SAMPLE_NAME,
          tripId: SAMPLE_TRIP_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 229.9,
          reason: "full",
        }),
    },
    {
      id: "stale-checkout-claimed",
      section: "Automatic refunds",
      name: "Sorry: penthouse taken during checkout",
      trigger:
        "Same as above for a penthouse: another group booked it while this checkout sat open past 30 minutes. Full refund, booking canceled.",
      recipient: "The person who paid",
      sandbox: "Hard to cause on purpose; use Send test.",
      render: () =>
        renderStaleCheckoutRefundEmail({
          name: SAMPLE_NAME,
          tripId: SAMPLE_TRIP_ID,
          tripName: SAMPLE_TRIP.name,
          amount: 229.9,
          reason: "claimed",
        }),
    },

    /* -- trip page ---------------------------------------------------------- */
    {
      id: "portal-link",
      section: "Trip page",
      name: "Fresh trip page link",
      trigger:
        "When someone opens an expired or broken trip page link and asks for a new one. Always goes to the email on the booking, never to an address typed in.",
      recipient: "The booking's own email address",
      sandbox:
        "Open the trip page link from a sandbox confirmation, change the t= value in the address bar, and ask for a fresh link.",
      render: () =>
        renderPortalLinkEmail({ name: SAMPLE_NAME, tripName: SAMPLE_TRIP.name, portalUrl: SAMPLE_PORTAL_URL }),
    },

    /* -- the list and the contact form -------------------------------------- */
    {
      id: "waitlist-welcome",
      section: "The list and the contact form",
      name: "Waitlist welcome",
      trigger: "When a new address joins the list (the /waitlist page, the home page or the footer form). Once per address.",
      recipient: "The person who joined",
      sandbox: "Join the list on /waitlist with an address you can read that hasn't joined before.",
      notes: [
        "The wording changes once booking is open; this preview uses this environment's setting.",
        "The real one carries a one-click unsubscribe header. The test leaves it off, and its unsubscribe link goes nowhere.",
      ],
      render: () => renderWaitlistWelcome("sample-preview-token"),
    },
    {
      id: "early-access",
      section: "The list and the contact form",
      name: "Head start: booking open to the list",
      trigger: "Sent from Admin, Launch, once per list member, when the list's head start begins.",
      recipient: "Everyone on the list who hasn't unsubscribed",
      sandbox: "Use Send a test to me on Admin, Launch. If your address is on the list, the test's button really opens booking.",
      notes: [
        "Each real one carries that member's own early-access link and a one-click unsubscribe header.",
        "This preview uses a sample link, which lands on the booking page's 'link didn't work' note.",
      ],
      render: () =>
        renderEarlyAccess({
          bookingUrl: `${getAppUrl()}/early-access?t=sample`,
          unsubscribeToken: "sample-preview-token",
          fromPrice: SAMPLE_FROM_PRICE,
        }),
    },
    {
      id: "waitlist-notification",
      section: "The list and the contact form",
      name: "New waitlist signup (to the team)",
      trigger: "Each time a new address joins the list. Plain text.",
      recipient: `The team, at the WAITLIST_NOTIFY_TO address (${waitlistNotify} in this environment; nothing is sent while it's blank)`,
      sandbox: "Join the list on /waitlist with a new address.",
      render: () =>
        renderWaitlistNotification(SAMPLE_EMAIL, {
          placement: "footer",
          source: "instagram",
          medium: "social",
          campaign: "telluride-launch",
        }),
    },
    {
      id: "contact-message",
      section: "The list and the contact form",
      name: "Contact form message (to the team)",
      trigger: "Each time someone sends the form on /contact. Plain text; replying goes straight to the sender.",
      recipient: "The team, at CONTACT_NOTIFY_TO (falling back to WAITLIST_NOTIFY_TO, then bookings@outrider.travel)",
      sandbox: "Send the form on /contact.",
      render: () =>
        renderContactMessage({
          name: SAMPLE_NAME,
          email: SAMPLE_EMAIL,
          message:
            "Hi! A few of us are thinking about Telluride in December. Can four friends all book Two to a Room and be put in rooms next to each other?",
        }),
    },

    /* -- Supabase ------------------------------------------------------------ */
    ...(
      [
        {
          file: "confirm-signup.html",
          name: "Confirm your email",
          trigger: "When someone creates an account, and again if they ask for the confirmation email to be resent.",
          sandbox: "Sign up at /signup with a new address.",
        },
        {
          file: "reset-password.html",
          name: "Reset your password",
          trigger: "When someone asks for a password reset on /forgot-password.",
          sandbox: "Ask for a reset on /forgot-password.",
        },
        {
          file: "magic-link.html",
          name: "Sign-in link",
          trigger: "Only if a password-free sign-in link is requested. The site doesn't offer one today.",
          sandbox: null,
        },
        {
          file: "email-change.html",
          name: "Confirm a new email address",
          trigger: "Only if an account's email address is changed. The site doesn't offer that today.",
          sandbox: null,
        },
      ] as const
    ).map(
      (t): EmailEntry => ({
        id: `supabase-${t.file.replace(".html", "")}`,
        section: "Account emails (sent by Supabase)",
        name: t.name,
        trigger: t.trigger,
        recipient: "The account holder",
        sandbox: t.sandbox,
        supabase: true,
        notes: [
          `Sent by Supabase, not this app, from the copy pasted into its dashboard (supabase/email-templates/${t.file} is the version kept in the repo). The subject line is set in the dashboard too. No test send from here.`,
        ],
        render: () => ({ subject: "Set in the Supabase dashboard", html: supabaseTemplate(t.file) }),
      }),
    ),
  ];
}
