import "server-only";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { getAppUrl } from "@/lib/site-url";

/*
 * What has to be true before the list's head start can go out, checked on the
 * server both when the page draws the checklist and again inside the send
 * action, which is the actual control (a disabled button is presentation).
 *
 * Each one exists because of a specific way a launch goes wrong:
 *   - booking already public: the email would promise a head start that
 *     isn't one;
 *   - Stripe in test mode: every list member reaches a checkout that cannot
 *     take a real card;
 *   - the app URL not the live https site: sent from a laptop, every link in
 *     twelve (or two hundred) inboxes would point at localhost;
 *   - no sender or no webhook secret: the email fails, or payments land in
 *     Stripe and never mark the booking paid.
 */

export type ReadinessCheck = { id: string; label: string; ok: boolean; fix: string };

export function launchReadiness(): ReadinessCheck[] {
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const appUrl = getAppUrl();

  return [
    {
      id: "not-public",
      label: "Booking is not open to everyone yet",
      ok: !BOOKINGS_OPEN,
      fix: "LAUNCHED is already true in lib/booking-window.ts, so there's no head start left to give.",
    },
    {
      id: "stripe-live",
      label: "Stripe is on live keys",
      ok: publishable.startsWith("pk_live_") && secret.startsWith("sk_live_"),
      fix: "Set STRIPE_SECRET_KEY (sk_live_) and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_) in Vercel Production, then redeploy.",
    },
    {
      id: "webhook",
      label: "Stripe webhook secret is set",
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      fix: "Add the live-mode webhook's signing secret as STRIPE_WEBHOOK_SECRET in Vercel Production.",
    },
    {
      id: "live-url",
      label: "Links point at the live site",
      ok: /^https:\/\//.test(appUrl) && !/localhost|127\.0\.0\.1/.test(appUrl),
      fix: `Links would go to ${appUrl}. Send from the live site's admin, with NEXT_PUBLIC_APP_URL set to it.`,
    },
    {
      id: "sender",
      label: "Email sending is set up",
      ok: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS),
      fix: "Set RESEND_API_KEY and EMAIL_FROM_ADDRESS in Vercel Production.",
    },
  ];
}

