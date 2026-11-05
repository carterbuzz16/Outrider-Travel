/*
 * The 72-hour chase for a spring break booking (3 November 2026), built on the
 * same shell as ./chase.ts, whose notes all apply. See ./confirmation-spring.ts
 * for why it is a separate file and what it must not ask for.
 *
 * Traveler details are normally done before this could go: checkout takes them
 * before the card, and with no rentals that is the whole task. Their block stays
 * for the one way they can be missing, details swept off a checkout left unpaid
 * for a week that was then paid (lib/stale-checkout.ts), when the trip page asks
 * again and this should too.
 *
 * Its headline does not say "a couple of things", because on this trip it is
 * often one. For the same reason the blocks are spaced rather than ruled: a rule
 * under the last block left open would sit there on its own, since a block
 * cannot know which of the others are showing.
 */
import type { TemplateVariables } from "@/lib/email/render-template";

export function springChaseSubject(firstName: string | null): string {
  return firstName ? `${firstName}, still to do before Punta Cana` : "Still to do before Punta Cana";
}

export default String.raw`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Still to do</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; display:block; }
  table { border-collapse:collapse !important; }
  body { height:100% !important; margin:0 !important; padding:0 !important; width:100% !important; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }
  @media screen and (max-width:620px) {
    .container { width:100% !important; max-width:100% !important; }
    .gutter { padding-left:24px !important; padding-right:24px !important; }
    .h1 { font-size:32px !important; }
    .h2 { font-size:20px !important; }
    .big { font-size:30px !important; }
    .stack { display:block !important; width:100% !important; padding-right:0 !important; padding-left:0 !important; }
    .stack-gap { padding-top:16px !important; }
    .nav a { font-size:10px !important; padding:0 6px !important; }
    .fluid { width:100% !important; height:auto !important; }
  }
</style>
</head>

<body style="margin:0; padding:0; background-color:#f2efea;">

<!-- SUBJECT:   {{first_name}}, still to do before Punta Cana
     PREHEADER: Two minutes and you're set for the trip. -->
<div style="display:none; font-size:1px; color:#f2efea; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  Two minutes and you're set for the trip.
  &#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efea;">
<tr>
<td align="center" style="padding:32px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#faf8f4;">

    <tr>
      <td align="center" bgcolor="#89B2C4" style="background-color:#89B2C4;">
        <a href="https://outrider.travel"><img src="https://www.outrider.travel/email/email-header-band.png" width="600" height="100" alt="Outrider" class="fluid" style="width:600px; height:100px; display:block;" /></a>
      </td>
    </tr>

    <tr>
      <td class="nav" align="center" bgcolor="#3E342F" style="background-color:#3E342F; padding:14px 20px;">
        <a href="{{portal_url}}" style="display:inline-block; padding:0 14px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Your trip</a>
        <a href="https://outrider.travel/spring-break" style="display:inline-block; padding:0 14px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Punta Cana</a>
        <a href="https://outrider.travel/faq" style="display:inline-block; padding:0 14px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">FAQ</a>
        <a href="mailto:bookings@outrider.travel" style="display:inline-block; padding:0 14px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Email us</a>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:44px 48px 0 48px;">
        <div class="h1" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:42px; line-height:1.04; font-weight:800; letter-spacing:-0.5px; color:#3E342F; text-transform:uppercase;">Still to do.</div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:20px 48px 0 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#3E342F;">
          {{first_name}}, {{trip_name}} is {{days_until_trip}} out and we're holding your spot. Here's what's still open on your side.
        </div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:32px 48px 0 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2EFEA" style="background-color:#F2EFEA;">
          <tr>
            <td width="4" bgcolor="#B4633C" style="background-color:#B4633C; font-size:0; line-height:0;">&nbsp;</td>
            <td style="padding:26px 28px 28px 28px;">

              <!-- {{#unless flights_booked}} -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Your flights</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Punta Cana (PUJ). Fly in <strong style="font-weight:600;">{{arrival_day}}</strong> and home <strong style="font-weight:600;">{{departure_day}}</strong>. Your transfers both ways are included, and you need a valid passport.
                      <a href="https://outrider.travel/flights#punta-cana" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Flight guide</a>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- {{/unless}} -->

              <!-- {{#unless rooming_submitted}} -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Who you're rooming with</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      It's two to a room, and we're assigning in the order requests land.
                      <a href="{{rooming_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Set your roommate</a>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- {{/unless}} -->

              <!-- {{#unless details_submitted}} -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Your traveler details</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Legal name, date of birth, emergency contact. Your name and date of birth go on your lodging records, and on travel insurance if you choose to add it.
                      <a href="{{traveler_details_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Add your details</a>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- {{/unless}} -->

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:2px;">
                <tr><td bgcolor="#3E342F" style="background-color:#3E342F;">
                  <a href="{{portal_url}}" style="display:inline-block; padding:16px 32px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Finish it now</a>
                </td></tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:36px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#89B2C4" style="background-color:#89B2C4;">
          <tr>
            <td class="gutter" style="padding:34px 48px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#2A2320;">Faster than a form</div>
              <div class="big" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; line-height:1.15; font-weight:800; letter-spacing:-0.3px; text-transform:uppercase; color:#2A2320; padding-top:10px;">
                <a href="mailto:bookings@outrider.travel" style="color:#2A2320; text-decoration:none;">Just hit reply</a>
              </div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#2A2320; padding-top:12px;">
                Reply with your roommate's name if that's easier. We'll put it in for you. A person answers within a day.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0; font-size:0; line-height:0;">
        <img src="https://www.outrider.travel/email/email-hero-spring.jpg" width="600" height="280" alt="Palm trees leaning over clear turquoise water at Zemi Miches" class="fluid" style="width:600px; height:280px; display:block;" />
      </td>
    </tr>

    <tr>
      <td class="gutter" bgcolor="#F2EFEA" style="background-color:#F2EFEA; padding:32px 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#6B635C; padding-bottom:16px;">Your trip at a glance</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" width="50%" valign="top" style="padding-right:16px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Dates</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px; padding-bottom:14px;">{{trip_dates}}</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Fly into</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px;">Punta Cana (PUJ)</div>
            </td>
            <td class="stack stack-gap" width="50%" valign="top" style="padding-left:16px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Staying at</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px; padding-bottom:14px;">{{property_name}}</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Balance</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px;">{{balance_due}} remaining</div>
            </td>
          </tr>
        </table>
        <div style="padding-top:18px;"><a href="https://outrider.travel/spring-break" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#3E342F; text-decoration:underline;">See the full trip page &rarr;</a></div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:40px 48px 48px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:22px;">
              <a href="https://outrider.travel"><img src="https://www.outrider.travel/email/outrider-mark-espresso.png" width="40" height="34" alt="Outrider" style="width:40px; height:34px; display:block;" /></a>
            </td>
          </tr>
          <tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding-top:24px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.9; color:#6B635C;">
              <a href="{{portal_url}}" style="color:#3E342F; text-decoration:underline;">Your trip</a> &nbsp;&nbsp;&nbsp;
              <a href="https://outrider.travel/spring-break" style="color:#3E342F; text-decoration:underline;">Punta Cana</a> &nbsp;&nbsp;&nbsp;
              <a href="https://outrider.travel/faq" style="color:#3E342F; text-decoration:underline;">FAQ</a> &nbsp;&nbsp;&nbsp;
              <a href="https://www.instagram.com/outridertravel/" style="color:#3E342F; text-decoration:underline;">Instagram</a><br />
              Questions? Reply to this email or write to <a href="mailto:bookings@outrider.travel" style="color:#3E342F; text-decoration:underline;">bookings@outrider.travel</a>.
            </td>
          </tr>
          <tr>
            <td style="padding-top:18px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.6; color:#6B635C;">
              Outrider Travel, LLC, [STREET ADDRESS], [CITY, STATE ZIP]<br />
              You're getting this because you booked a trip with us.
              <a href="{{preferences_url}}" style="color:#6B635C; text-decoration:underline;">Email preferences</a>
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
</html>
`;

/** The plain-text part: what is still open and where to do it, nothing else. */
export function springChaseText(
  v: TemplateVariables,
  flags: { flights_booked: boolean; rooming_submitted: boolean; details_submitted: boolean },
): string {
  const open: string[] = [];
  if (!flags.flights_booked) {
    open.push(
      `Your flights into Punta Cana (PUJ). Fly in ${v.arrival_day} and home ${v.departure_day}. You need a valid passport. Flight guide: https://outrider.travel/flights#punta-cana`,
    );
  }
  if (!flags.rooming_submitted) open.push(`Who you're rooming with: ${v.rooming_url}`);
  if (!flags.details_submitted) open.push(`Your traveler details: ${v.traveler_details_url}`);
  return [
    `${v.first_name}, ${v.trip_name} is ${v.days_until_trip} out and we're holding your spot. Still open on your side:`,
    "",
    ...open.map((line) => `- ${line}`),
    "",
    `Finish it on your trip page: ${v.portal_url}`,
    "",
    "Or reply with your roommate's name and we'll put it in for you. A person answers within a day.",
  ].join("\n");
}
