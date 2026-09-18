# Post-booking flow: test checklist

Covers the SMS opt-in, the confirmation email (email 1), the trip portal and
its two forms, the 72-hour chase (email 2), and every link in both emails.
Run it on the checkout sandbox before anything reaches production.

- Preview: https://outrider-travel-git-checkout-sandbox-outrider2.vercel.app
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
  3DS test card if you want the bank step: `4000 0027 6000 3184`.

The preview shares its database with the live site. Use a `[test] ` trip
(listed only in the sandbox), and cancel test bookings when you are done.

## 0. Before you start (owner)

These have to exist or the designed emails cannot go out. Until they do, the
confirmation falls back to the plain one and the chase is skipped; the Vercel
logs name what is missing (`confirmation email: booking ... sent the plain
confirmation; the designed one is missing: ...`).

- [ ] **Migration applied**: `prisma/migrations/20260918120000_add_post_booking_forms`.
      Nothing in the portal, the opt-in or the email claims works without it.
      Apply it before this branch serves real traffic.
- [ ] **Trip logistics** in `lib/trip-logistics.ts`, for every departure
      (keyed by start date): `propertyName`, `arrivalDeadline`,
      `departureEarliest`, `roomingLockDate` (ISO date), `tripCapacity`
      (Telluride Dec 14 is set to 100; Jan 4 has nothing yet).
- [ ] **SMS_NUMBER** (display, e.g. `(256) 929-9189`) and **SMS_NUMBER_RAW**
      (E.164, e.g. `+12569291189`) in Vercel, Preview and Production. Redeploy
      after setting: the Terms page reads SMS_NUMBER at build time.
- [ ] **PORTAL_TOKEN_SECRET** in Vercel: `openssl rand -hex 32`. At least 32
      characters. Rotating it breaks every link already sent.
- [ ] **EMAIL_FROM_ADDRESS** = `Outrider <hello@outrider.travel>`, a real inbox
      somebody watches. Replies go there too (reply-to is the same address).
- [ ] **Resend domain** `outrider.travel` verified, with **SPF, DKIM and DMARC**
      records added at the DNS host. Check with mail-tester.com (aim for 9/10).
- [ ] **NEXT_PUBLIC_APP_URL** = `https://outrider.travel` in Production. Portal
      links in email are built from it. (The brief calls this
      NEXT_PUBLIC_SITE_URL; this codebase uses NEXT_PUBLIC_APP_URL, one
      variable, see `lib/site-url.ts`.) On a preview, leave it unset so links
      point at the preview itself.
- [ ] **CRON_SECRET** set (already needed by the installment cron).
- [ ] **Before launch: clear sandbox Stripe ids.** The sandbox runs on Stripe
      test keys against the live database, so every account that checked out
      on it has a test-mode customer (`cus_...`) and, after a deposit, a
      test-mode card (`pm_...`) saved on its `users` row. The live keys have
      never heard of either. The code copes (checkout replaces a customer
      Stripe does not have, and the installment cron flags an installment whose
      saved card it cannot use rather than retrying it), but clear them anyway
      so no one starts live with a dead id. Run this yourself in the Supabase
      SQL editor, **after** switching Vercel Production to live keys, with the
      emails of the accounts actually used on the sandbox:

      ```sql
      update users
      set stripe_customer_id = null,
          stripe_default_payment_method_id = null
      where email in ('you@example.com', 'teammate@example.com');
      ```

      Check the `where` before running it: a real traveler's row cleared by
      mistake loses the card their installments are charged to.
- [ ] **Legal name**: the opt-in copy says "Outrider LLC"; the site's legal name
      is "Outrider Travel, LLC" (`lib/site-content.ts`). Carriers want the
      checkbox, the site and the 10DLC brand registration to match exactly.
      Decide which is right and make all three agree (changing the opt-in
      text means a new version string in `lib/sms-consent.ts`).

## 1. Stripe test checkout, end to end

- [ ] Sign in on the preview, open a `[test] ` trip, pick a tier.
- [ ] The text-message box is there, **unticked**, below the terms box, with
      "Privacy Policy" and "Terms" as links that open in a new tab.
- [ ] Booking without ticking it works (it is not required).
- [ ] Book once with it **ticked**, once **unticked**. In Supabase, the ticked
      booking has `sms_consent = true`, `sms_consent_at` set (server time) and
      `sms_consent_text_version = 'sms-optin-2026-09-18'`; the unticked one has
      `false`, null, null.
- [ ] Pay the deposit with 4242. Repeat on another booking with "Pay in full".
- [ ] The confirmation page shows "Your spot is held" (or "paid for"), a
      **Confirmation OR-XXXXXX** number, and a "Next, today" block, "Book
      flights, request roommates, add traveler details", with an "Open your
      trip page" button that opens the portal.
- [ ] The bookings page shows the same OR- number on that booking.
- [ ] Previews get no webhooks from Stripe; the confirmation page's sync does
      the webhook's work. Check the booking is `deposit_paid` / `paid_in_full`,
      installments are scheduled (deposit only), and one email arrived.

## 2. Confirmation email: once and only once

- [ ] Exactly one email arrives. `bookings.confirmation_email_sent_at` is set.
- [ ] With every value in section 0 filled in, it is the designed email
      ("You're in. Three things to do today."). With anything missing, it is the
      plain "You're booked: ..." email, which still links to the trip page when
      PORTAL_TOKEN_SECRET is set.
- [ ] Refresh the confirmation page several times: no second email.
- [ ] **Webhook retry** (production endpoint, or `stripe listen` locally): in
      the Stripe dashboard, Developers, Events, open the
      `payment_intent.succeeded` for the booking and press **Resend**. The
      endpoint answers 200 and no second email arrives.
- [ ] Race: open the confirmation page in two tabs at once right after paying.
      One email.
- [ ] Failure path: temporarily break `EMAIL_FROM_ADDRESS` on a preview, pay,
      and check `confirmation_email_sent_at` is back to null after the failed
      send (the log says "claim released"). Restore it; the next day's
      `/api/cron/post-booking-emails` run (or a Resend of the event) sends it.
- [ ] Paid in full: the receipt reads "Remaining $0" and "Next installment of
      $0 comes out never (paid in full) on the card you used." See the note at
      the end about this sentence.
- [ ] Deposit: "Next installment of $X comes out <date>" matches the first
      scheduled payment on the bookings page.

## 3. The portal and its forms

Use the "Open your trip page" button, or the links in the email.

- [ ] The page opens without logging in and shows the booking, the three tasks
      and the payment schedule.
- [ ] `...#rooming` and `...#details` land on the roommate and details tasks.
- [ ] **Flights**: mark booked. `bookings.flights_booked` becomes true, and the
      task reads "Done". Unmark it and it goes back.
- [ ] **Roommates**: submit up to three names. `rooming_requests` has one row,
      `submitted_at` set; `bookings.rooming_submitted = true`,
      `rooming_submitted_at` equals that time. Edit and resubmit: the row
      updates but `submitted_at` does not move (queue position is kept).
- [ ] Roommates, "no preference": saves with no names.
- [ ] **Traveler details**: submit. `traveler_details` has one row;
      `bookings.details_submitted = true`. The page does not show legal name,
      date of birth, phone or emergency contact back (view source too).
- [ ] A cancelled booking's portal shows the cancelled notice and no forms.

## 4. Portal token: verifies and expires

- [ ] Change one character of `t=` in the URL: "This link does not open a
      trip".
- [ ] Change the booking id in the path, keep the token: same message.
- [ ] Remove `t=` entirely: same message.
- [ ] **Expiry.** Tokens last 30 days, so mint one that is already expired,
      locally, with a one-off script that only calls `lib/portal-token.ts` and
      never touches the database. In a shell with the same
      PORTAL_TOKEN_SECRET as the preview exported:
      `npx tsx -e 'import("./lib/portal-token.ts").then(m => console.log(m.createPortalToken("<booking-uuid>", -60)))'`
      (a negative TTL gives an expiry one minute in the past). Open
      `<preview>/trip/<booking-uuid>?t=<that token>`: "This link has expired",
      with the "send a fresh link" form. Do not commit a script for this.
- [ ] Request a fresh link from that page: it arrives at the booking's own
      email address (never an address typed in), and it opens the page.
- [ ] Unset PORTAL_TOKEN_SECRET on a preview: every link reads as unavailable
      ("disabled"), and the confirmation falls back to the plain email.

## 5. The chase (email 2)

The cron runs daily at 16:00 UTC (`vercel.json`). To run it on demand:
`curl -H "Authorization: Bearer $CRON_SECRET" <preview>/api/cron/post-booking-emails`.
It answers with counts, e.g. `{"confirmations":{},"chases":{"sent":1}}`.

To avoid waiting 72 hours on a test booking, move its
`confirmation_email_sent_at` back by hand in the Supabase table editor (test
bookings only).

- [ ] All three done (flights, roommates, details): no chase, and
      `chase_email_sent_at` stays null. The booking is never selected.
- [ ] Nothing done: all three blocks, in order, then "Finish it now".
- [ ] Flights only done: no flights block; roommates and details shown.
- [ ] Roommates only done: flights and details shown.
- [ ] Details only done: flights and roommates shown (the roommate block has a
      divider after it; expected, it is the template's markup).
- [ ] Two done: exactly the one open block shown.
- [ ] "{N} people have already sent theirs" matches the count of
      `rooming_requests` on live bookings for that trip.
- [ ] "{trip} is {N} days out": N matches the calendar.
- [ ] After a send, `chase_email_sent_at` is set; run the cron again and no
      second chase goes.
- [ ] With a trip-logistics value or SMS_NUMBER missing, the chase is skipped
      and the log names the missing values; nothing is written.
- [ ] Subject: "{first name}, we're still missing a couple of things" (or
      without the name when there is none).

## 6. Every link in both emails

Click each one from a phone and from desktop Gmail. None should 404.

Both emails:
- [ ] Header image link: `https://outrider.travel`
- [ ] Nav "Your trip", button, footer "Your trip": `{{portal_url}}` (the portal)
- [ ] Nav and footer "Telluride": `https://outrider.travel/telluride`
- [ ] Nav and footer "FAQ": `https://outrider.travel/faq`
- [ ] Nav "Text us", the big "Text ..." line, footer number:
      `sms:{{sms_number_raw}}`. Opens Messages on a phone.
- [ ] Footer "Instagram": `https://instagram.com/outrider.travel` (the site's
      own Instagram link is `instagram.com/outridertravel`, no dot; one of them
      is wrong)
- [ ] Footer email: `mailto:hello@outrider.travel` (the site's contact address
      is `bookings@outrider.travel`; make sure hello@ exists and is watched)
- [ ] Footer "Email preferences": `{{preferences_url}}` =
      `https://outrider.travel/privacy#email`
- [ ] Footer mark image link: `https://outrider.travel`

Email 1 only:
- [ ] "Flight guide": `https://outrider.travel/flights`
- [ ] "Set your roommates": `{{rooming_url}}` = portal + `#rooming`
- [ ] "Add your details": `{{traveler_details_url}}` = portal + `#details`
- [ ] "Do all three now", "See your payment schedule": portal
- [ ] "Stuck on any of it" email link: `mailto:hello@outrider.travel`
- [ ] "Full breakdown": `https://outrider.travel/telluride#included` lands on
      the inclusions section

Email 2 only:
- [ ] "Flight guide": `https://outrider.travel/flights`
- [ ] "Set your roommates": portal + `#rooming`
- [ ] "Add your details": portal + `#details`
- [ ] "Finish it now": portal
- [ ] "See the full trip page": `https://outrider.travel/telluride`

Images (both): `/email/email-header-band.png`, `/email/email-hero-telluride.jpg`,
`/email/email-band-gorrono.jpg` (email 1), `/email/outrider-mark-espresso.png`
load from `https://outrider.travel`. The email hard-codes the production
domain, so on a preview these only work once production serves them.

## 7. Legal pages (carrier registration)

- [ ] `/privacy` has "Text messages", including "No mobile information will be
      shared with third parties or affiliates for marketing or promotional
      purposes." Version 1.1.0.
- [ ] `/terms` has "Text messages: Outrider trip texts" with program name,
      frequency, rates, HELP, STOP, not a condition of purchase, carrier
      liability, and the Privacy Policy link. Version 2.1.0. The text number
      shows once SMS_NUMBER is set and the site is redeployed.
- [ ] Screenshot the booking form's opt-in box for the 10DLC campaign
      submission.

## Known wording limits (template copy, not code)

These come from the email templates, which are sent verbatim apart from the
variables. Changing them means editing the HTML.

- Paid in full, email 1: the sentence "Next installment of X comes out Y on
  the card you used" has no conditional. It is filled as "$0" and "never (paid
  in full)". Worth adding an `{{#unless paid_in_full}}` block around it.
- With no name on the account, the greeting is "Hello &mdash; your spot on
  ..." and "Hello &mdash; {trip} is N days out".
- Email 2 reads "1 people have already sent theirs" when the count is 1, and
  "0 people" when it is 0.
