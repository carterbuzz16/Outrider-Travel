import "server-only";
import { Resend } from "resend";
import { renderEmailLayout } from "@/lib/email/layout";
import { PORTAL_TOKEN_TTL_SECONDS } from "@/lib/portal-token";

const LINK_DAYS = Math.round(PORTAL_TOKEN_TTL_SECONDS / 86400);

/**
 * "Here is a fresh link to your trip page", sent when a portal link has
 * lapsed and the reader asks for another from the page itself.
 *
 * In its own file rather than lib/email/send.ts so it can land without
 * touching that module, which other work is changing. The Resend client and
 * from-address rules are the same as send.ts's: those two helpers are not
 * exported from there, so they are restated here, deliberately identical. If
 * send.ts ever exports them, import them instead and delete these.
 *
 * The caller decides the recipient (the booking's own email on file, never an
 * address typed into the page); this function only formats and sends.
 */

let resendInstance: Resend | undefined;

function getResend(): Resend {
  // Lazy, as in send.ts: a missing RESEND_API_KEY should break this send, not
  // `next build`.
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

function getFromAddress(): string {
  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error("EMAIL_FROM_ADDRESS is not set; see .env.local.example.");
  }
  return process.env.EMAIL_FROM_ADDRESS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPortalLinkEmail(opts: {
  to: string;
  name: string | null;
  tripName: string;
  portalUrl: string;
}) {
  const { to, name, tripName, portalUrl } = opts;
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Here is a fresh link to your trip page for <strong>${escapeHtml(tripName)}</strong>. It is where you confirm your flights, send your roommate request and fill in your traveler details.</p>
    <p>The link works for ${LINK_DAYS} days. It opens your booking without a password, so please keep it to yourself rather than sharing it in a group chat.</p>
    <p style="font-size: 13px; color: #6B635C;">If you did not ask for this, you can ignore it. Nothing has changed on your booking.</p>
  `;

  // resend.emails.send() resolves with { error } on an API failure rather
  // than throwing, so turn that into a throw the caller can catch and log.
  const { error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: `Your trip page: ${tripName}`,
    html: renderEmailLayout({
      preheader: `A fresh link to your ${tripName} trip page.`,
      bodyHtml,
      ctaLabel: "Open your trip page",
      ctaUrl: portalUrl,
    }),
    text: [
      name ? `Hi ${name},` : "Hi,",
      "",
      `Here is a fresh link to your trip page for ${tripName}:`,
      portalUrl,
      "",
      `It works for ${LINK_DAYS} days and opens your booking without a password, so please keep it to yourself.`,
      "",
      "If you did not ask for this, you can ignore it.",
    ].join("\n"),
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
  }
}
