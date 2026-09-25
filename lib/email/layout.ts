import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import { getAppUrl } from "@/lib/site-url";
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
  espresso: "#3E342F", // dark ground, type on light, the filled button
  paper: "#F2EFEA", // page background, type on espresso
  chalk: "#FAF8F4", // the card
  club: "#89B2C4", // Ski Club blue: the header band only (a mid tone, not text)
  muted: "#6B635C",
  rule: "#D7D2CB",
};

/*
 * Where email images are fetched from: always production, and the www host.
 * Not getAppUrl(): in local dev and on previews that is localhost or a
 * preview URL, which a mail client either cannot reach or will stop reaching
 * once the preview is gone, and the images in public/email never change per
 * environment (see its README). Not the bare domain either, which 308s to
 * www, a redirect not every mail client's image loader follows.
 */
export const EMAIL_ASSET_ORIGIN = "https://www.outrider.travel";

const FONT = "Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif";

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
const DEFAULT_FOOTER_NOTE = "You're getting this because you have a booking with Outrider.";

/**
 * Every transactional email (confirmation fallback, receipts, payment problems,
 * refunds, penthouse, trip-page link, admin alert) renders through this, so it
 * carries the Ski Club look from the owner's email shell: the club-blue header
 * band with the espresso mark, an optional eyebrow and Figtree-capitals
 * headline, square espresso button, hairline footer with the postal address.
 * Same rules as the shell: tables and inline styles only, 600px, absolute
 * image URLs, nothing essential inside an image.
 */
export function renderEmailLayout(opts: {
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Small capitals line above the headline. Plain text, escaped here. */
  eyebrow?: string;
  /** Big capitals headline at the top of the email. Plain text, escaped here. */
  headline?: string;
  /**
   * Why the reader is getting this, in the footer. Plain text, escaped here.
   * Defaults to the booking line; mail to anyone without a booking (the list,
   * the back office, a released checkout) says its own reason instead.
   */
  footerNote?: string;
}) {
  const { bodyHtml, ctaLabel, ctaUrl } = opts;
  const origin = getAppUrl().replace(/\/+$/, "");
  const preheader = escapeHtml(opts.preheader);
  const footerNote = escapeHtml(opts.footerNote ?? DEFAULT_FOOTER_NOTE);

  const headingHtml = opts.headline
    ? `
    <tr>
      <td class="gutter" style="padding:44px 48px 0 48px;">
        ${opts.eyebrow ? `<div style="font-family:${FONT}; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:${BRAND.muted}; padding-bottom:14px;">${escapeHtml(opts.eyebrow)}</div>` : ""}
        <div class="h1" style="font-family:${FONT}; font-size:36px; line-height:1.06; font-weight:800; letter-spacing:-0.5px; color:${BRAND.espresso}; text-transform:uppercase;">${escapeHtml(opts.headline)}</div>
      </td>
    </tr>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
    <tr>
      <td class="gutter" style="padding:8px 48px 8px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="${BRAND.espresso}" style="background-color:${BRAND.espresso};">
              <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:16px 32px; font-family:${FONT}; font-size:12px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:${BRAND.paper}; text-decoration:none;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
      : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Outrider</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
  .body a { color: ${BRAND.espresso}; }
  @media screen and (max-width: 620px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .gutter { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 32px !important; line-height: 1.08 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.paper};">
<div style="display:none; font-size:1px; color:${BRAND.paper}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">${preheader}&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.paper};">
<tr>
<td align="center" style="padding:32px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:${BRAND.chalk};">
    <tr>
      <td align="center" bgcolor="${BRAND.club}" style="background-color:${BRAND.club}; padding:32px 40px;">
        <img src="${EMAIL_ASSET_ORIGIN}/email/outrider-mark-espresso.png" width="52" alt="Outrider" style="display:block; width:52px; height:auto;" />
      </td>
    </tr>
    ${headingHtml}
    <tr>
      <td class="gutter body" style="padding:${opts.headline ? "24px" : "44px"} 48px 16px 48px; font-family:${FONT}; font-size:16px; line-height:1.6; color:${BRAND.espresso};">
        ${bodyHtml}
      </td>
    </tr>
    ${ctaHtml}
    <tr>
      <td class="gutter" style="padding:32px 48px 44px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid ${BRAND.rule}; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding-top:24px; font-family:${FONT}; font-size:13px; line-height:1.7; color:${BRAND.muted};">
              <strong style="color:${BRAND.espresso}; font-weight:600;">Outrider</strong><br />
              Questions go to <a href="mailto:${CONTACT.email}" style="color:${BRAND.espresso}; text-decoration:underline;">${CONTACT.email}</a>. We reply within a day.<br />
              <a href="${origin}" style="color:${BRAND.espresso}; text-decoration:underline;">outrider.travel</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:18px; font-family:${FONT}; font-size:11px; line-height:1.6; color:${BRAND.muted};">
              ${footerNote}${POSTAL_LINE ? `<br />${escapeHtml(POSTAL_LINE)}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</td>
</tr>
</table>
</body>
</html>`;
}
