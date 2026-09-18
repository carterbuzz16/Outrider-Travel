/*
 * Email 2, the 72-hour chase, VERBATIM from the owner's email package (outrider-email-02-chase.html).
 *
 * Do not reformat, re-indent or "clean up" anything between the backticks: the
 * tables and inline styles are deliberate and Outlook depends on them. The only
 * changes ever made to this markup are the variable substitutions in
 * lib/email/post-booking.ts, at send time.
 *
 * Why a .ts module and not the .html file: a module is bundled into the
 * serverless function, so nothing has to be traced or read from disk at run
 * time on Vercel. String.raw keeps every byte as written. That only works
 * while the markup contains no backtick, no dollar-brace sequence and no
 * backslash; check for all three before pasting in a new version.
 */
export default String.raw`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Still need a couple of things</title>
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

<!--
  ===================================================================
  EMAIL 2 — THE CHASE.  Sent 3 days after checkout, and ONLY to people
  who still have something outstanding. If all three are done, do not
  send this at all; they get the roommate reveal instead at T-45.

  Each numbered block below is wrapped in a conditional comment. Render
  the block only when that flag is false:
      {{#unless flights_booked}} ... {{/unless}}
      {{#unless rooming_submitted}} ... {{/unless}}
      {{#unless details_submitted}} ... {{/unless}}
  Substitute your own templating syntax.
  ===================================================================
-->

<body style="margin:0; padding:0; background-color:#f2efea;">

<!-- SUBJECT:   {{first_name}}, we're still missing a couple of things
     PREHEADER: Two minutes and you're set for December. -->
<div style="display:none; font-size:1px; color:#f2efea; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  Two minutes and you're set for December.
  &#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efea;">
<tr>
<td align="center" style="padding:32px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#faf8f4;">

    <tr>
      <td align="center" bgcolor="#89B2C4" style="background-color:#89B2C4;">
        <a href="https://outrider.travel"><img src="https://outrider.travel/email/email-header-band.png" width="600" height="100" alt="Outrider" class="fluid" style="width:600px; height:100px; display:block;" /></a>
      </td>
    </tr>

    <tr>
      <td class="nav" align="center" bgcolor="#3E342F" style="background-color:#3E342F; padding:14px 20px;">
        <a href="{{portal_url}}" style="display:inline-block; padding:0 10px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Your trip</a>
        <span style="color:#6B635C;">&middot;</span>
        <a href="https://outrider.travel/telluride" style="display:inline-block; padding:0 10px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Telluride</a>
        <span style="color:#6B635C;">&middot;</span>
        <a href="https://outrider.travel/faq" style="display:inline-block; padding:0 10px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">FAQ</a>
        <span style="color:#6B635C;">&middot;</span>
        <a href="sms:{{sms_number_raw}}" style="display:inline-block; padding:0 10px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Text us</a>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:44px 48px 0 48px;">
        <div class="h1" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:42px; line-height:1.04; font-weight:800; letter-spacing:-0.5px; color:#3E342F; text-transform:uppercase;">Still need<br />a couple of things.</div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:20px 48px 0 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#3E342F;">
          {{first_name}} &mdash; {{trip_name}} is {{days_until_trip}} days out and we're holding your spot. Here's what's still open on your side.
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Your flights</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Montrose (MTJ) runs a handful of winter flights a day and they are going. Land by <strong style="font-weight:600;">{{arrival_deadline}}</strong>, fly out after <strong style="font-weight:600;">{{departure_earliest}}</strong>.
                      <a href="https://outrider.travel/flights" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Flight guide</a>
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr></table>
              <!-- {{/unless}} -->

              <!-- {{#unless rooming_submitted}} -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Who you're rooming with</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      We're assigning in the order requests land. {{rooming_submitted_count}} people have already sent theirs. Assignments lock {{rooming_lock_date}}.
                      <a href="{{rooming_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Set your roommates</a>
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr></table>
              <!-- {{/unless}} -->

              <!-- {{#unless details_submitted}} -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Your traveler details</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Legal name, date of birth, emergency contact, rental sizes. This is what activates your insurance and gets your gear fitted before you land.
                      <a href="{{traveler_details_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Add your details</a>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- {{/unless}} -->

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
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
                <a href="sms:{{sms_number_raw}}" style="color:#2A2320; text-decoration:none;">Text {{sms_number}}</a>
              </div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#2A2320; padding-top:12px;">
                Send us your roommates in a text if that's easier. We'll put them in for you. A person answers, usually inside an hour.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0; font-size:0; line-height:0;">
        <img src="https://outrider.travel/email/email-hero-telluride.jpg" width="600" height="280" alt="Last light on the San Juans above Telluride" class="fluid" style="width:600px; height:280px; display:block;" />
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
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px;">Montrose (MTJ)</div>
            </td>
            <td class="stack stack-gap" width="50%" valign="top" style="padding-left:16px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Staying at</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px; padding-bottom:14px;">{{property_name}}</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Balance</div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:4px;">{{balance_due}} remaining</div>
            </td>
          </tr>
        </table>
        <div style="padding-top:18px;"><a href="https://outrider.travel/telluride" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:#3E342F; text-decoration:underline;">See the full trip page &rarr;</a></div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:40px 48px 48px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:22px;">
              <a href="https://outrider.travel"><img src="https://outrider.travel/email/outrider-mark-espresso.png" width="40" height="34" alt="Outrider" style="width:40px; height:34px; display:block;" /></a>
            </td>
          </tr>
          <tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding-top:24px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.9; color:#6B635C;">
              <a href="{{portal_url}}" style="color:#3E342F; text-decoration:underline;">Your trip</a> &nbsp;&middot;&nbsp;
              <a href="https://outrider.travel/telluride" style="color:#3E342F; text-decoration:underline;">Telluride</a> &nbsp;&middot;&nbsp;
              <a href="https://outrider.travel/faq" style="color:#3E342F; text-decoration:underline;">FAQ</a> &nbsp;&middot;&nbsp;
              <a href="https://instagram.com/outrider.travel" style="color:#3E342F; text-decoration:underline;">Instagram</a><br />
              Text <a href="sms:{{sms_number_raw}}" style="color:#3E342F; text-decoration:underline;">{{sms_number}}</a> or email <a href="mailto:hello@outrider.travel" style="color:#3E342F; text-decoration:underline;">hello@outrider.travel</a>.
            </td>
          </tr>
          <tr>
            <td style="padding-top:18px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.6; color:#6B635C;">
              Outrider LLC &middot; [STREET ADDRESS] &middot; [CITY, STATE ZIP]<br />
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
