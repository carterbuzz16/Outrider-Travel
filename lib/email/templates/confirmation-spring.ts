/*
 * The booking confirmation for a spring break booking (3 November 2026), built
 * on the same shell as ./confirmation.ts, whose notes on the markup, the image
 * hosts, the texting number and the middots all apply here. Same rule on what
 * can go between the backticks: no backtick, no dollar-brace, no backslash.
 *
 * A separate file rather than flags in that one because that one is the owner's
 * package, verbatim, and the two differ in most of their sentences. What differs:
 *
 *   - Two things to do, not three. Checkout took the traveler's details before
 *     the card, and with no rentals that was all of them (lib/traveler-details.ts).
 *   - It asks for nothing lib/trip-logistics.ts holds null for spring break:
 *     no {{trip_capacity}}, no {{rooming_lock_date}}. Asking would send every
 *     spring break booker the plain fallback, since the render refuses a gap.
 *   - No events and no band photograph. There are no events to show, and
 *     Telluride's photographs would be a lie here.
 *   - It says only what Carter has given for the trip. Do not spell out what
 *     the all-inclusive plan covers, or add a payment date: those come through
 *     {{next_payment_date}}, from lib/installments.ts.
 *
 * The header band and the footer's mark are the plain Outrider mark, with no
 * Ski Club lock-up in the artwork (public/email/email-header-band.png).
 *
 * The hero is the beach photograph the spring break welcome already uses. It is
 * not the hotel, so nothing here captions it as the hotel.
 */
import type { TemplateVariables } from "@/lib/email/render-template";

export const SPRING_CONFIRMATION_SUBJECT = "You're in. Two things to do today.";

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

<!-- SUBJECT:   You're in. Two things to do today.
     PREHEADER: Flights into Punta Cana and your roommate. Both now. -->
<div style="display:none; font-size:1px; color:#f2efea; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  Flights into Punta Cana and your roommate. Both now.
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
      <td bgcolor="#2A2320" style="background-color:#2A2320; font-size:0; line-height:0;">
        <img src="https://www.outrider.travel/email/email-hero-spring.jpg" width="600" height="280" alt="Palm trees leaning over clear turquoise water at Zemi Miches" class="fluid" style="width:600px; height:280px; display:block;" />
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
          {{first_name}}, your spot on {{trip_name}}, {{trip_dates}}, is held. Your receipt is further down.
        </div>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#3E342F; padding-top:14px;">
          First, two things we need from you <strong style="font-weight:600;">today</strong>. Both are in one place and take about two minutes.
        </div>
      </td>
    </tr>

    <!-- ============ TWO THINGS, NOW ============ -->
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
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Book your flights into Punta Cana</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      Punta Cana (PUJ). The hotel is an hour and a half from the airport, and your transfers both ways are already included.
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.7; color:#3E342F; padding-top:10px;">
                      Fly in <strong style="font-weight:600;">{{arrival_day}}</strong><br />
                      Fly home <strong style="font-weight:600;">{{departure_day}}</strong>
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:8px;">
                      You need a valid passport for this trip, so check yours before you book.
                      <a href="https://outrider.travel/flights#punta-cana" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Flight guide</a>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr></table>

              <!-- 02 roommate -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td width="56" valign="top" style="padding:0 16px 0 0;">
                    <div class="num" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:34px; font-weight:800; line-height:1; color:#B4633C;">02</div>
                  </td>
                  <td valign="top">
                    <div class="h2" style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; line-height:1.25; font-weight:500; color:#3E342F;">Tell us who you're rooming with</div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#3E342F; padding-top:8px;">
                      It's two to a room, so name the one person you want to share with. We assign rooms in the order requests come in, so the earlier you send it the better.
                    </div>
                    <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:8px;">
                      <a href="{{rooming_url}}" style="color:#9C4F2E; text-decoration:underline; font-weight:600;">Set your roommate</a>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
                <tr><td bgcolor="#3E342F" style="background-color:#3E342F;">
                  <a href="{{portal_url}}" style="display:inline-block; padding:16px 32px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#F2EFEA; text-decoration:none;">Do both now</a>
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
                <a href="mailto:bookings@outrider.travel" style="color:#2A2320; text-decoration:none;">Just hit reply</a>
              </div>
              <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#2A2320; padding-top:12px;">
                A person answers within a day. Not a ticket queue, not a bot. You can also write to
                <a href="mailto:bookings@outrider.travel" style="color:#2A2320; text-decoration:underline;">bookings@outrider.travel</a>.
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
            <td valign="top" style="padding:14px 0; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.45; color:#3E342F;">{{property_name}}<br /><span style="color:#6B635C; font-size:15px;">All-inclusive, on the beach.</span></td>
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
          Your next payment, {{next_payment_amount}}, comes out {{next_payment_date}} on the card you used.
          <!-- {{/unless}} -->
          <!-- {{#unless has_balance}} -->
          You paid in full, so nothing more comes out.
          <!-- {{/unless}} -->
          Nothing else gets added: no booking fee, no service charge.
          <a href="{{portal_url}}" style="color:#3E342F; text-decoration:underline;">See your payment schedule</a>
        </div>
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
              All-inclusive, on the beach<br />
              Two to a room, two queen beds
            </td>
            <td class="stack stack-gap" width="50%" valign="top" style="padding-left:16px; font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.85; color:#3E342F;">
              Airport transfers, both ways<br />
              Welcome happy hour<br />
              Welcome gift<br />
              Our team on site, the whole trip
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
          <tr><td style="border-top:1px solid #d7d2cb; font-size:0; line-height:0;">&nbsp;</td></tr>
        </table>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B635C; padding-top:14px;">
          Not in it: flights and travel insurance. You can add your own through Faye, <a href="https://www.withfaye.com/quote/offer?utm_campaign=carter.busby&amp;utm_source=outrider.travel&amp;utm_medium=bd-traveladvisors&amp;utm_term=glinda" style="color:#3E342F; text-decoration:underline;">a quote takes about a minute</a>.
          <a href="https://outrider.travel/spring-break" style="color:#3E342F; text-decoration:underline;">See the trip</a>
        </div>
        <div style="font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.6; color:#6B635C; padding-top:10px;">
          Faye is a partner of ours. We earn a commission if you buy through this link, and it costs you nothing extra.
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
                Your room closer to the trip. Then what to pack, then travel day.
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

/** The plain-text part: the links that matter, nothing else. */
export function springConfirmationText(v: TemplateVariables): string {
  return [
    `${v.first_name}, your spot on ${v.trip_name}, ${v.trip_dates}, is held.`,
    "",
    "Two things we need from you today, both in one place:",
    `1. Book your flights into Punta Cana (PUJ). Fly in ${v.arrival_day} and home ${v.departure_day}. The hotel is an hour and a half from the airport, and your transfers both ways are included. You need a valid passport for this trip. Flight guide: https://outrider.travel/flights#punta-cana`,
    `2. Tell us who you're rooming with: ${v.rooming_url}`,
    "",
    `Your trip page: ${v.portal_url}`,
    "",
    `Confirmation ${v.confirmation_number}. ${v.tier_name}, ${v.total_price} per person. Paid today ${v.amount_paid}, remaining ${v.balance_due}.`,
    "",
    "Questions? Reply to this email or write to bookings@outrider.travel. A person answers within a day.",
  ].join("\n");
}
