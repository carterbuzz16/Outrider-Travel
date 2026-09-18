/*
 * Email 1, the booking confirmation, VERBATIM from the owner's email package (outrider-email-01-confirmation.html).
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
 *
 * Words only (never markup) were edited in September 2026 to match the
 * owner's decisions: travel insurance is an optional add-on, replies come
 * within a day, no month named, and no em dashes in the copy.
 */
export default String.raw`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>You're in</title>
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
    .h1 { font-size:34px !important; }
    .h2 { font-size:21px !important; }
    .num { font-size:30px !important; }
    .big { font-size:30px !important; }
    .stack { display:block !important; width:100% !important; padding-right:0 !important; padding-left:0 !important; }
    .stack-gap { padding-top:16px !important; }
    .nav a { font-size:10px !important; padding:0 6px !important; }
    .fluid { width:100% !important; height:auto !important; }
  }
</style>
</head>

<body style="margin:0; padding:0; background-color:#f2efea;">

<!-- SUBJECT:   You're in. Three things to do today.
     PREHEADER: Flights into Montrose, your roommates, and your details. All three now. -->
<div style="display:none; font-size:1px; color:#f2efea; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  Flights into Montrose, your roommates, and your details. All three now.
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
      <td bgcolor="#2A2320" style="background-color:#2A2320; font-size:0; line-height:0;">
        <img src="https://outrider.travel/email/email-hero-telluride.jpg" width="600" height="280" alt="Last light on the San Juans above Telluride" class="fluid" style="width:600px; height:280px; display:block;" />
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:44px 48px 0 48px;">
        <div class="h1" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:46px; line-height:1.02; font-weight:800; letter-spacing:-0.5px; color:#3E342F; text-transform:uppercase;">You're in.</div>
      </td>
    </tr>

    <tr>
      <td class="gutter" style="padding:20px 48px 0 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#3E342F;">
          {{first_name}}, your spot on {{trip_name}}, {{trip_dates}}, is held. One of {{trip_capacity}}, and that is the cap. Your receipt is further down.
        </div>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#3E342F; padding-top:14px;">
          First, three things we need from you <strong style="font-weight:600;">today</strong>. All three are in one place and take about five minutes together.
        </div>
      </td>
    </tr>

    <!-- ============ THREE THINGS, NOW ============ -->
    <tr>
      <td class="gutter" style="padding:34px 48px 0 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2EFEA" style="background-color:#F2EFEA;">
          <tr>
            <td width="4" bgcolor="#B4633C" style="background-color:#B4633C; font-size:0; line-height:0;">&nbsp;</td>
            <td style="padding:28px 28px 30px 28px;">

              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#9C4F2E;">Do these today</div>

              <!-- 01 flights -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                <tr>
                  <td width="56" valign="top" style="padding:0 16px 0 0;">
                    <div class="num" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; font-weight:800; line-height:1; color:#B4633C;">01</div>
                  </td>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Book your flights into Montrose</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Montrose Regional (MTJ), not Denver. A handful of winter flights a day, and they sell out, so do this one first.
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.7; color:#3E342F; padding-top:10px;">
                      Land by <strong style="font-weight:600;">{{arrival_deadline}}</strong><br />
                      Fly out after <strong style="font-weight:600;">{{departure_earliest}}</strong>
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:8px;">
                      Inside that window your ground transport both ways is already paid for.
                      <a href="https://outrider.travel/flights" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Flight guide</a>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr></table>

              <!-- 02 roommates -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td width="56" valign="top" style="padding:0 16px 0 0;">
                    <div class="num" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; font-weight:800; line-height:1; color:#B4633C;">02</div>
                  </td>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Tell us who you're rooming with</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Name up to three people. We assign rooms in the order requests come in, so the earlier you send it the better the odds we can keep your group together.
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:8px;">
                      Same-gender rooms. Assignments lock {{rooming_lock_date}}.
                      <a href="{{rooming_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Set your roommates</a>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr></table>

              <!-- 03 details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td width="56" valign="top" style="padding:0 16px 0 0;">
                    <div class="num" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; font-weight:800; line-height:1; color:#B4633C;">03</div>
                  </td>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Fill in your traveler details</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Legal name, date of birth, emergency contact, and your rental sizes. Two minutes.
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:8px;">
                      Your name and date of birth go on your lift tickets and lodging records, and on travel insurance if you choose to add it. Your sizes get your skis or board fitted before you land, so you skip the rental line on day one.
                      <a href="{{traveler_details_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Add your details</a>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
                <tr><td bgcolor="#3E342F" style="background-color:#3E342F;">
                  <a href="{{portal_url}}" style="display:inline-block; padding:16px 32px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Do all three now</a>
                </td></tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ REACH US ============ -->
    <tr>
      <td style="padding:36px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#89B2C4" style="background-color:#89B2C4;">
          <tr>
            <td class="gutter" style="padding:34px 48px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#2A2320;">Stuck on any of it</div>
              <div class="big" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; line-height:1.15; font-weight:800; letter-spacing:-0.3px; text-transform:uppercase; color:#2A2320; padding-top:10px;">
                <a href="sms:{{sms_number_raw}}" style="color:#2A2320; text-decoration:none;">Text {{sms_number}}</a>
              </div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#2A2320; padding-top:12px;">
                A person answers within a day. Email works too:
                <a href="mailto:bookings@outrider.travel" style="color:#2A2320; text-decoration:underline;">bookings@outrider.travel</a>. Not a ticket queue, not a bot.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ RECEIPT ============ -->
    <tr>
      <td class="gutter" style="padding:40px 48px 0 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#6B635C; padding-bottom:12px;">What you booked</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td width="132" valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Trip</td>
            <td valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.45; color:#3E342F;">{{trip_name}}, {{trip_dates}}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td width="132" valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Staying at</td>
            <td valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.45; color:#3E342F;">{{property_name}}<br /><span style="color:#6B635C; font-size:15px;">Ski-in, ski-out. Whole group, one roof.</span></td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td width="132" valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Package</td>
            <td valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.45; color:#3E342F;">{{tier_name}}, {{total_price}} per person</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td width="132" valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#6B635C;">Confirmation</td>
            <td valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.45; color:#3E342F;">{{confirmation_number}}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; color:#3E342F;">Paid today</td>
            <td align="right" valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; color:#3E342F;">{{amount_paid}}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
          <tr>
            <td valign="top" style="padding:14px 16px 14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; color:#3E342F;">Remaining</td>
            <td align="right" valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; color:#3E342F;">{{balance_due}}</td>
          </tr>
          <tr><td colspan="2" style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:14px;">
          <!-- {{#unless paid_in_full}} -->
          Next installment of {{next_payment_amount}} comes out {{next_payment_date}} on the card you used.
          <!-- {{/unless}} -->
          <!-- {{#unless has_balance}} -->
          You paid in full, so there are no installments to come.
          <!-- {{/unless}} -->
          Nothing else gets added: no booking fee, no service charge.
          <a href="{{portal_url}}" style="color:#3E342F; text-decoration:underline;">See your payment schedule</a>
        </div>
      </td>
    </tr>

    <!-- ============ PHOTO BAND ============ -->
    <tr>
      <td style="padding:40px 0 0 0; font-size:0; line-height:0;">
        <img src="https://outrider.travel/email/email-band-gorrono.jpg" width="600" height="210" alt="Gorrono Ranch, the mid-mountain saloon at Telluride" class="fluid" style="width:600px; height:210px; display:block;" />
      </td>
    </tr>
    <tr>
      <td class="gutter" bgcolor="#F2EFEA" style="background-color:#F2EFEA; padding:18px 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#6B635C;">Gorrono Ranch &middot; Mid-mountain</div>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#3E342F; padding-top:6px;">One afternoon, one table, the whole group. Already in your price.</div>
      </td>
    </tr>

    <!-- ============ IN THE PRICE ============ -->
    <tr>
      <td class="gutter" style="padding:40px 48px 0 48px;">
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#6B635C; padding-bottom:16px;">In the price</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" width="50%" valign="top" style="padding-right:16px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.85; color:#3E342F;">
              Four nights at {{property_name}}<br />
              Three days of lift tickets<br />
              Ski or board rentals<br />
              Airport transport, both ways
            </td>
            <td class="stack stack-gap" width="50%" valign="top" style="padding-left:16px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.85; color:#3E342F;">
              Welcome event &amp; Gorrono BBQ<br />
              Private group events all week<br />
              Welcome gift<br />
              Staff on the ground, the whole trip
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
          <tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:14px;">
          Not in it: flights, lunch you buy on the mountain, and travel insurance, which you can add if you want it. That is the whole list.
          <a href="https://outrider.travel/telluride#included" style="color:#3E342F; text-decoration:underline;">Full breakdown</a>
        </div>
      </td>
    </tr>

    <!-- ============ NEXT ============ -->
    <tr>
      <td style="padding:44px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#3E342F" style="background-color:#3E342F;">
          <tr>
            <td class="gutter" style="padding:36px 48px;">
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#89B2C4;">Next from us</div>
              <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:23px; line-height:1.35; font-weight:500; color:#F2EFEA; padding-top:12px;">
                Your room and your group about a month out. Then what to pack, then travel day.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ FOOTER ============ -->
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
              <a href="https://www.instagram.com/outridertravel/" style="color:#3E342F; text-decoration:underline;">Instagram</a><br />
              Text <a href="sms:{{sms_number_raw}}" style="color:#3E342F; text-decoration:underline;">{{sms_number}}</a> or email <a href="mailto:bookings@outrider.travel" style="color:#3E342F; text-decoration:underline;">bookings@outrider.travel</a>.
            </td>
          </tr>
          <tr>
            <td style="padding-top:18px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.6; color:#6B635C;">
              Outrider Travel, LLC &middot; [STREET ADDRESS] &middot; [CITY, STATE ZIP]<br />
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
