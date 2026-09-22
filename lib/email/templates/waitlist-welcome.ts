/**
 * The waitlist welcome, built on the owner's branded email shell
 * (outrider-email-shell.html from the email package): the Ski Club blue header
 * band with the mark, the Telluride hero photo, Figtree capitals, hairline
 * detail rows, one espresso panel and the standard footer.
 *
 * Table-based and inline-styled on purpose, like the other templates in this
 * folder: Outlook and Gmail depend on it. Images are absolute URLs on the live
 * domain (public/email/), and nothing essential lives inside an image.
 *
 * All interpolated values are escaped by the caller-supplied escape function
 * or are fixed strings from this file.
 */

export type WaitlistWelcomeParts = {
  /** The live site origin, e.g. https://www.outrider.travel. No trailing slash. */
  origin: string;
  /** Personal unsubscribe page, already absolute. */
  unsubscribeUrl: string;
  /** Whether booking is open, which changes the promise and the button. */
  bookingsOpen: boolean;
  /** Footer address lines, already escaped. */
  addressLine: string;
  preheader: string;
};

const FONT = "Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif";

function row(label: string, value: string) {
  return `
          <tr>
            <td width="130" valign="top" style="padding:16px 16px 16px 0; font-family:${FONT}; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">${label}</td>
            <td valign="top" style="padding:16px 0; font-family:${FONT}; font-size:16px; line-height:1.45; color:#3E342F;">${value}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>`;
}

export function waitlistWelcomeHtml(p: WaitlistWelcomeParts): string {
  const promise = p.bookingsOpen
    ? "Booking for Telluride is open now. And whenever the next trip goes up, this list hears about it before anyone else."
    : "Four nights in Telluride this winter with your favorite people. When booking opens, this list hears it first, before it goes up anywhere else.";
  const button = p.bookingsOpen
    ? { label: "Reserve your spot", href: `${p.origin}/telluride` }
    : { label: "See the trip", href: `${p.origin}/telluride` };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>You're on the Outrider list</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  @media screen and (max-width: 620px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .gutter { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 36px !important; line-height: 1.05 !important; }
    .h2 { font-size: 22px !important; }
    .hero { width: 100% !important; height: auto !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f2efea;">

<div style="display:none; font-size:1px; color:#f2efea; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  ${p.preheader}
  &#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efea;">
<tr>
<td align="center" style="padding:32px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#faf8f4;">

    <tr>
      <td align="center" bgcolor="#89B2C4" style="background-color:#89B2C4; padding:36px 40px;">
        <img src="${p.origin}/email/outrider-mark-espresso.png" width="56" height="48" alt="Outrider" style="display:block; width:56px; height:auto;" />
      </td>
    </tr>

    <tr>
      <td style="padding:0; font-size:0; line-height:0;">
        <img class="hero" src="${p.origin}/email/email-hero-telluride.jpg" width="600" alt="Telluride's peaks at dusk, snow on the ridgelines" style="display:block; width:600px; max-width:100%; height:auto;" />
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:48px 48px 0 48px;">
        <div style="font-family:${FONT}; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#6B635C;">Outrider &middot; Telluride this winter</div>
        <div class="h1" style="font-family:${FONT}; font-size:46px; line-height:1.02; font-weight:800; letter-spacing:-0.5px; color:#3E342F; text-transform:uppercase; padding-top:14px;">You&rsquo;re on<br />the list</div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:24px 48px 0 48px;">
        <div style="font-family:${FONT}; font-size:17px; line-height:1.6; color:#3E342F;">${promise}</div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:32px 48px 0 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          ${row("When", "December 14&ndash;18, 2026<br />January 4&ndash;8, 2027")}
          ${row("Where", "The Peaks, Mountain Village. Ski-in, ski-out.")}
          ${row("Rooms", "Four to a room, two to a room, or a whole penthouse for your eight")}
          ${row("Included", "Lift tickets and ski or snowboard rentals, rides from Montrose, a BBQ at Gorrono Ranch, and our team on the ground all week")}
        </table>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:36px 48px 0 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="#3E342F" style="background-color:#3E342F;">
              <a href="${button.href}" style="display:inline-block; padding:16px 32px; font-family:${FONT}; font-size:12px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">${button.label}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:44px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#3E342F" style="background-color:#3E342F;">
          <tr>
            <td class="gutter" style="padding:36px 48px;">
              <div style="font-family:${FONT}; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#89B2C4;">Bring your people</div>
              <div class="h2" style="font-family:${FONT}; font-size:24px; line-height:1.3; font-weight:500; color:#F2EFEA; padding-top:12px;">Send this to the friends you&rsquo;d go with. Book with the same group code and you&rsquo;re placed together.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:40px 48px 48px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding-top:28px; font-family:${FONT}; font-size:13px; line-height:1.7; color:#6B635C;">
              <strong style="color:#3E342F; font-weight:600;">Outrider</strong><br />
              Questions go to <a href="mailto:bookings@outrider.travel" style="color:#3E342F; text-decoration:underline;">bookings@outrider.travel</a>. We reply within a day.<br />
              <a href="${p.origin}" style="color:#3E342F; text-decoration:underline;">outrider.travel</a> &middot; <a href="https://www.instagram.com/outridertravel/" style="color:#3E342F; text-decoration:underline;">@outridertravel</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:20px; font-family:${FONT}; font-size:11px; line-height:1.6; color:#6B635C;">
              ${p.addressLine}<br />
              You&rsquo;re getting this because you joined the Outrider list. We only email when a trip opens.
              <a href="${p.unsubscribeUrl}" style="color:#6B635C; text-decoration:underline;">Unsubscribe</a>
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
