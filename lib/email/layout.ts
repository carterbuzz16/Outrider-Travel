import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
// Table-based layout with inline styles. Not a stylistic choice, it is what
// is actually required to render consistently across email clients (Outlook
// desktop renders HTML through Word's engine, which ignores most modern CSS
// and strips <style> blocks in many contexts).
//
// The palette is the real one from app/globals.css. Two constraints carried
// over from there, because they apply just as much in an inbox:
//   - Ski Club blue (#89B2C4) is a mid tone and is not legible on paper at text
//     size, so the button is espresso (#3E342F), 10.5:1 against paper, as it
//     is on the site;
//   - warm gray on espresso is 8.0:1, which is what the header relies on.
/* CAN-SPAM requires a physical postal address in commercial email. Rendered
 * from the same constant the privacy policy uses, so the two cannot disagree,
 * and it stays out of the site layout entirely. */
const POSTAL_LINE = CONTACT.postalAddress
  ? `${LEGAL_NAME}, ${CONTACT.postalAddress.join(", ")}`
  : "";

const BRAND = {
  name: "OUTRIDER",
  charcoal: "#3E342F", // espresso: the dark ground
  teal: "#3E342F", // the filled button, espresso on paper
  cream: "#F2EFEA", // paper: type on the dark header
  paper: "#FAF8F4",
  text: "#3E342F",
  muted: "#6B635C",
  border: "#D7D2CB",
  bg: "#F2EFEA",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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

/** The footer line most mail carries: it goes to people with a booking. */
const DEFAULT_FOOTER_NOTE = "You're receiving this because you have a booking with Outrider. Questions? Just reply to this email.";

export function renderEmailLayout(opts: {
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /**
   * Why the reader is getting this, in the footer. Plain text, escaped here.
   * Defaults to the booking line; mail to anyone without a booking (the list,
   * the back office, a released checkout) says its own reason instead.
   */
  footerNote?: string;
}) {
  const { bodyHtml, ctaLabel, ctaUrl } = opts;
  const preheader = escapeHtml(opts.preheader);
  const footerNote = escapeHtml(opts.footerNote ?? DEFAULT_FOOTER_NOTE);

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
    <tr>
      <td style="padding: 8px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius: 2px; background-color: ${BRAND.teal};">
              <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.cream}; text-decoration: none;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.bg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid ${BRAND.border};">
          <tr>
            <td style="background-color: ${BRAND.charcoal}; padding: 24px 32px;">
              <span style="font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 20px; letter-spacing: 4px; color: ${BRAND.cream};">${BRAND.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 8px; color: ${BRAND.text}; font-size: 16px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaHtml}
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid ${BRAND.border}; color: ${BRAND.muted}; font-size: 12px; line-height: 1.5;">
              ${footerNote}
              <br /><br />
              ${POSTAL_LINE}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
