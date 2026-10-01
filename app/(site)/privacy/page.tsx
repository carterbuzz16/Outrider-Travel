import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { PRIVACY } from "@/lib/legal";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import LegalDocument, { LegalList, LegalSection } from "../legal/LegalDocument";
import AdChoices from "@/components/AdChoices";

/**
 * Privacy Policy.
 *
 * Written against what the application actually does, not against a template.
 * Every claim below was checked in the code: card handling in
 * components/CheckoutForm.tsx and lib/stripe.ts, session cookies in
 * lib/supabase/middleware.ts, the waitlist and its Resend audience in
 * app/waitlist-actions.ts, the contact form in app/(site)/contact/actions.ts,
 * and the IP-keyed rate limiter in lib/rate-limit.ts. Site statistics come
 * from Vercel Web Analytics, which is cookieless. Since 1.3.0 there is also
 * the Meta Pixel, for Instagram ads to people who have visited: what it
 * sends, where it never runs and how to opt out are stated below, and each
 * of those is enforced in lib/meta-pixel.ts. Change one, change the other.
 * Since 1.4.0 there is also the $100 code by email (app/code-offer-actions.ts,
 * lib/code-offer-server.ts for its cookie, app/api/cron/code-offer-reminders
 * for the reminders).
 *
 * Where the code has no answer, a retention schedule, for instance, which
 * simply does not exist yet, the page says so in a flag instead of inventing
 * a commitment the company would then be held to.
 */

export const metadata: Metadata = pageMetadata({
  title: PRIVACY.title,
  path: "/privacy",
  description: PRIVACY.description,
});

export default function PrivacyPage() {
  return (
    <LegalDocument doc={PRIVACY}>
      <LegalSection doc={PRIVACY} id="scope">
        <p>
          This policy explains what {LEGAL_NAME} (&ldquo;Outrider&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects about you, why, who it
          goes to, and what you can do about it. It covers this website, the
          booking flow, and the emails we send you about a booking.
        </p>
        <p>
          Outrider is based in {CONTACT.base} and is the party responsible for
          the information described here. The companies that store and process it
          on our behalf are named in section {sectionIndex("sharing")}, we do
          not hide behind &ldquo;trusted partners&rdquo;.
        </p>
        <p>
          It does not cover what a hotel, ski resort, rental shop, transport
          operator or insurer does with your information once we pass it to them
          to deliver your trip. They have their own policies, and their own
          responsibilities under them.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="what-we-collect">
        <h3>Account information</h3>
        <p>
          Signing up creates an account with Supabase Auth, which stores your
          email address and a hashed password on our behalf; we never see or
          store your password in a readable form. Alongside it we hold your
          email, your name and, if you give it, your phone number.
        </p>

        <h3>Booking information</h3>
        <p>
          When you book we record which trip and tier you chose, the total price
          and deposit, the booking status, your group code if you are traveling
          with people you know, and the date you booked. Against that booking we
          record each payment: the amount, its status, the date it is scheduled
          for, when it was paid, how many charge attempts have been made, and a
          reference to the payment at Stripe.
        </p>
        <p>
          Running a trip also needs information we ask for outside the checkout, names as they appear on identification, dates of birth, ability
          level, equipment sizing, dietary requirements, emergency contacts, and
          any medical condition or allergy relevant to your safety on the
          mountain.
        </p>

        <h3>Your trip page and traveler details</h3>
        <p>
          After you book, we send you a private link to your trip page. The link
          opens the page without a password, so anyone who has it can see your
          booking and payment schedule and use the forms on it. Please keep it
          to yourself. Links stop working after a while; the page can send a
          fresh one, and it only ever goes to the email address on your booking.
        </p>
        <p>On the trip page we ask for:</p>
        <LegalList
          items={[
            <>
              your legal name as it appears on your ID and your date of birth,
              which the travel insurer covering the trip needs in order to
              insure you;
            </>,
            <>
              your phone number, and the name and phone number of an emergency
              contact, so trip staff can reach you and someone at home;
            </>,
            <>
              your height, weight and shoe size, whether you ski or snowboard,
              and your ability level, so the rental shop can have your
              equipment ready before you arrive;
            </>,
            <>any dietary restrictions, for meals on the trip;</>,
            <>
              the names of up to three people you would like to room with, or
              that you have no preference, and the time you sent the request,
              because rooms are assigned in the order requests arrive;
            </>,
            <>whether you have booked your flights.</>,
          ]}
        />
        <p>
          We never send your legal name, date of birth or emergency contact by
          email, and the trip page does not show them back once they are saved.
        </p>

        <h3>Messages you send us</h3>
        <p>
          The contact form takes your name, email address and message and emails
          them to us. It is not stored in our database, the record is the email
          in our inbox, and the reply thread that follows.
        </p>

        <h3>Waitlist</h3>
        <p>
          Joining the waitlist stores your name, email address, mobile number
          and the date you joined in our database. It also stores your answer
          to each of the form&rsquo;s two boxes (email and text messages), when
          you gave it, which version of their wording you saw, and the IP
          address and browser the form was sent from, as the record of that
          consent. If a link brought you to the form, we store its short tag
          (for example, one from an event) and campaign tags, and which form on
          the site you used. Your name and email address are also added to our
          mailing list at Resend.
        </p>

        <h3>A $100 code by email</h3>
        <p>
          Asking for a $100 code on our Telluride page stores your email
          address, the code we give you and when it runs out, your answer to the
          box asking whether we may email you about Outrider trips, when you gave
          it and which version of its wording you saw, the IP address and browser
          the request came from, and the campaign tags of the link that brought
          you. If you tick the box, your email address is also added to our
          mailing list at Resend. We also put the code in a cookie on this site
          so that it comes off at checkout (see section{" "}
          {sectionIndex("cookies")}).
        </p>

        <h3>Technical information</h3>
        <p>
          Like any website, ours receives your IP address, your browser type and
          version, and the page you requested, and our host records them. See
          section {sectionIndex("logs")}.
        </p>

        <h3>Your visits, through the Meta Pixel</h3>
        <p>
          When the Meta Pixel runs (see section {sectionIndex("cookies")}), it
          sends Meta the address of the page you are viewing and of the page
          you came from, your IP address, your browser and device type, and the
          identifiers in its cookies. It also tells Meta when you join the
          waitlist or ask for a $100 code, when you reach the card form for a
          new booking, and when you make a booking&rsquo;s first payment, with
          the amount. It does not send
          your name, email address, phone number, card details or anything you
          type into a form.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="payment-data">
        <p>
          <strong>
            Your card details go directly to Stripe. Outrider never receives,
            sees or stores your full card number, expiry date or security code.
          </strong>
        </p>
        <p>
          The card fields on our checkout page are not ours: they are served by
          Stripe inside a frame on the page, and what you type into them is sent
          from your browser straight to Stripe. It does not pass through our
          servers and it is not written to our database. Stripe is a PCI DSS
          Level 1 service provider, and using it this way is what keeps card data
          out of our systems entirely.
        </p>
        <p>What we do store about a payment is:</p>
        <LegalList
          items={[
            <>a Stripe customer identifier for your account;</>,
            <>
              an identifier for the card you saved at checkout, a reference held
              at Stripe, not the card number itself, and not something that can
              be used to charge you anywhere else;
            </>,
            <>
              for each payment: the amount, its status, its scheduled date, the
              date it was paid, the number of attempts made, and the Stripe
              payment identifier.
            </>,
          ]}
        />
        <p>
          When you pay a deposit, the card you use is saved at Stripe against
          your customer record so that the scheduled installments described in{" "}
          <Link href="/terms#payment-plan">the Terms of Service</Link> can be
          charged automatically. Refunds and disputes are handled through Stripe.
          Stripe processes your payment information as a business in its own
          right as well as on our behalf, under{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noreferrer noopener"
          >
            its own privacy policy
          </a>, including for fraud prevention.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="how-we-use">
        <p>We use your information to:</p>
        <LegalList
          items={[
            <>create and secure your account, and sign you in;</>,
            <>
              take bookings, charge deposits and installments, issue refunds, and
              keep the accounting records a business is required to keep;
            </>,
            <>
              run the trip, passing what each supplier needs in order to give
              you a room, a lift ticket, the right rental gear, a seat in a
              vehicle, a meal you can eat, and care if something goes wrong;
            </>,
            <>
              email you about your booking: confirmation, receipts, a warning
              when a payment fails, a request to verify a payment with your bank,
              a link to your trip page and a reminder if something on it is
              still open, and practical information before departure;
            </>,
            <>
              text you about your trip, if you opted in to texts on your
              trip page (see section {sectionIndex("sms")});
            </>,
            <>
              text you about Outrider trips, if you ticked the text box when
              you joined the waitlist (see section {sectionIndex("sms")});
            </>,
            <>
              answer messages you send us, and keep a record of what was agreed;
            </>,
            <>
              send trip announcements to people who joined the waitlist or
              otherwise asked for them;
            </>,
            <>
              email you a $100 code you asked for, and up to two reminders
              before it runs out (see section {sectionIndex("email")});
            </>,
            <>
              show Outrider ads on Instagram and Facebook to people who have
              visited this site, and measure how those ads perform (see section{" "}
              {sectionIndex("cookies")});
            </>,
            <>
              keep the site working and safe, preventing abuse, limiting how
              often an anonymous form can be submitted, and investigating
              problems;
            </>,
            <>meet our legal obligations and defend legal claims.</>,
          ]}
        />
        <p>
          We do not sell your personal information. We do share information
          about your visits with Meta, through the Meta Pixel, so that we can
          show our ads to people who have been here. Under California law that
          counts as sharing for cross-context behavioural advertising, and you
          can opt out of it; see section {sectionIndex("cookies")}.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="cookies">
        <p>
          Our own cookies do three things. The first is keeping you signed in.
          When you log in, Supabase sets session cookies through our server, and
          our middleware refreshes them as you move around the site so your
          session stays valid. Without them the booking area cannot know who you
          are.
        </p>
        <p>
          The second is the private booking link we email to the list when
          booking opens to it first. Opening it stores the link&rsquo;s token in
          a cookie named outrider_early_access, so the booking page knows you
          came through it.
        </p>
        <p>
          The third is a $100 code you asked for. We store it in a cookie named
          outrider_offer, which the page&rsquo;s own scripts cannot read and
          which expires when the code does, so that the code comes off at
          checkout whichever Reserve button you use. It holds only the code.
        </p>
        <p>
          We also use the Meta Pixel, a piece of code from Meta Platforms that
          runs on our pages. It sets a cookie on this site, named _fbp, that
          identifies your browser to Meta, and when you arrive by clicking one of
          our ads, a second, named _fbc, recording that click. It tells Meta
          which of our pages you visit and the few actions listed in section{" "}
          {sectionIndex("what-we-collect")}. Meta uses that to show Outrider ads
          on Instagram and Facebook to people who have visited, and to tell us,
          in totals, how our ads are doing. Meta also uses what it receives under
          its own terms and{" "}
          <a
            href="https://www.facebook.com/privacy/policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            privacy policy
          </a>
          , and can connect it to your Instagram or Facebook account if you have
          one.
        </p>
        <p>
          <strong>
            The pixel runs only on the live site, and never on a page whose link
            carries a private code
          </strong>
          , such as your trip-page link, a penthouse invite, a discount code or
          a sign-in link. It does not run when your device is set to a European
          time zone, which is how we keep it off for visitors in the EEA, the UK
          and Switzerland. Our own site statistics, from Vercel, set no cookie
          and store nothing on your device.
        </p>
        <h3 id="ad-choices">Your ad choices</h3>
        <p>
          You can opt out of the Meta Pixel with the switch below. It applies to
          this browser only, so if you use several browsers or devices, set it in
          each, and clearing your browser&rsquo;s data resets it. If your browser
          sends a Global Privacy Control signal, we treat that as an opt-out
          without you doing anything. You can also control the ads Meta shows
          you in the ad settings of your Instagram or Facebook account.
        </p>
        <AdChoices />
        <p>
          Stripe sets its own cookies on pages where you enter card details, to
          detect fraud and to make its payment form work. Those are Stripe&rsquo;s
          and are governed by its policy.
        </p>
        <p>
          You can block or delete cookies in your browser. Blocking Meta&rsquo;s
          does not affect the site. If you block ours, you will not be able to
          stay signed in, and the booking pages will not work.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="email">
        <p>
          Email is sent through Resend, which receives the address we are sending
          to and the content of the message.
        </p>
        <p>
          <strong>Booking email is not marketing and cannot be turned off</strong>{" "}
          while you have a live booking: a receipt, a failed-payment warning, a
          request to verify a payment with your bank, your trip-page link and a
          reminder when something on it is still open, and pre-departure
          logistics are part of the service you bought. If you do not want them,
          cancel the booking.
        </p>
        <p>
          <strong>Waitlist and announcement email is marketing</strong> and you
          can leave at any time, use the unsubscribe link in any of those
          messages, or email {CONTACT.email} and we will remove you. Your address
          is held in our database and in our mailing audience at Resend;
          unsubscribing marks you unsubscribed in both.
        </p>
        <p>
          <strong>A $100 code you ask for</strong> comes by email straight away,
          followed by at most two reminders before it runs out: two days before
          its last day, and on its last day. They stop if you use the code,
          book, or unsubscribe with the link in any of them. They are sent
          whether or not you tick the box about Outrider trips; the box decides
          only whether you also join the list. Each address gets one code. If
          an address that already has one is typed again, we email the code to
          that address again and do not show it on the page.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="sms">
        <p>
          Your trip page has a separate box for text messages. It is not
          ticked for you, and booking does not depend on it. If you tick it, we
          record that you agreed, when, and which version of the wording you
          saw, and we use the mobile number you give us to send you automated
          texts about your trip: logistics, reminders and answers to your
          questions. Message frequency varies, and message and data rates may
          apply. Reply HELP for help, or STOP at any time to stop them. The
          program is described in{" "}
          <Link href="/terms#sms">the Terms of Service</Link>.
        </p>
        <p>
          The waitlist form has its own box for texts about Outrider trips. It
          is not ticked for you, and joining the list does not depend on it. If
          you tick it, we record that you agreed, when, and which version of the
          wording you saw, and we may use the mobile number you give us to send
          you automated marketing texts about Outrider trips. Message frequency
          varies, and message and data rates may apply. Reply HELP for help, or
          STOP at any time to stop them.
        </p>
        <p>
          <strong>
            No mobile information will be shared with third parties or
            affiliates for marketing or promotional purposes.
          </strong>{" "}
          We do not sell, rent or share your mobile number, your text-message
          opt-in or your consent with anyone for their own marketing. Text
          messaging opt-in data and consent are excluded from every kind of
          sharing described in section {sectionIndex("sharing")}, and will not
          be shared with any third party, apart from the text-messaging service
          that sends our texts on our behalf, which may use them only to deliver
          our messages.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="logs">
        <p>
          Our site runs on Vercel and our database is hosted by Supabase. Both
          keep server logs, which record IP addresses, timestamps, requested
          URLs and error details. Those logs exist to keep the service running
          and to let us diagnose problems, and they are held for as long as those
          providers retain them.
        </p>
        <p>
          The waitlist, the $100 code and the contact forms are open to anyone,
          so they are rate limited. To do that we store a short-lived record
          keyed to the IP address the request came from (and, for the $100
          code, to the email address typed), counting how many submissions it
          has made recently (within the past day at most). It is used for
          nothing else, not for analytics, not for profiling, not for
          advertising.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="sharing">
        <p>We share personal information with five kinds of recipient.</p>

        <h3>Service providers that run the platform</h3>
        <LegalList
          items={[
            <>
              <strong>Supabase</strong>, database and authentication. Holds your
              account, bookings and payment records.
            </>,
            <>
              <strong>Stripe</strong>, payments. Holds your card details and
              payment history; see section {sectionIndex("payment-data")}.
            </>,
            <>
              <strong>Resend</strong>, email delivery and the waitlist mailing
              audience.
            </>,
            <>
              <strong>Vercel</strong>, hosting and server logs.
            </>,
            <>
              A <strong>text-messaging service</strong>, only if you opted in to
              texts: your mobile number and the messages between us, used only
              to deliver them. See section {sectionIndex("sms")}.
            </>,
          ]}
        />

        <h3>Meta, for advertising</h3>
        <p>
          Meta Platforms receives the visit information described in section{" "}
          {sectionIndex("what-we-collect")} through the Meta Pixel, so that we
          can show our ads to people who have visited this site and measure
          them. It receives no traveler details, no mobile number and no
          text-message consent. Of a booking, it learns only that a first payment
          was made, and the amount. You can opt out; see section{" "}
          {sectionIndex("cookies")}.
        </p>

        <h3>Trip suppliers</h3>
        <p>
          To run a trip we pass what each supplier needs, and no more: your name
          and room assignment to the lodging operator; your name and ability or
          sizing details to the lift-ticket vendor, rental shop, guides and
          instructors; your name and pickup details to the transport operator;
          dietary requirements to a chef or caterer; and the information an
          insurer needs to cover you. Where something is medically relevant to
          your safety, we share it with the people responsible for you on the
          mountain.
        </p>
        <p>
          In particular, the traveler details from your trip page go only where
          running the trip needs them: your legal name and date of birth to the
          travel insurer covering the trip; your height, weight, shoe size,
          ski-or-snowboard choice and ability level to the rental shop fitting
          your equipment; your dietary restrictions to whoever is feeding the
          group; and your phone number and emergency contact to the trip staff
          looking after you. None of it is shared for anyone&rsquo;s marketing.
        </p>

        <h3>Professional advisers and authorities</h3>
        <p>
          Accountants, insurers and lawyers where they need it; and law
          enforcement, regulators or a court where we are legally required to
          disclose, or where disclosure is necessary to protect someone from
          serious harm or to establish or defend a legal claim.
        </p>

        <h3>A successor business</h3>
        <p>
          If Outrider is sold, merged or restructured, records including customer
          information may transfer to the buyer as part of the business, subject
          to this policy.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="retention">
        <p>
          We keep booking, payment and correspondence records for as long as we
          need them to run the trip, to meet tax, accounting and insurance
          obligations, and to defend a legal claim. Account information is kept
          while your account exists. Waitlist addresses, and addresses that
          asked for a $100 code, are kept until you unsubscribe or ask us to
          remove you.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="rights">
        <p>
          Whatever jurisdiction you are in, you can ask us to do the following,
          and we will do it or explain why we cannot:
        </p>
        <LegalList
          items={[
            <>tell you what information we hold about you, and give you a copy;</>,
            <>correct anything inaccurate;</>,
            <>
              delete your information, subject to what we must keep for legal,
              tax and accounting reasons, a completed booking cannot simply be
              erased;
            </>,
            <>stop sending you marketing email;</>,
            <>
              stop sharing your visits with Meta for advertising, which you can
              also do yourself with the switch in section{" "}
              {sectionIndex("cookies")};
            </>,
            <>stop texting you, which you can also do by replying STOP;</>,
            <>
              stop using your card for future installments, though this does not
              cancel the booking or what you owe under it.
            </>,
          ]}
        />
        <p>
          Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> with what
          you want, from the address on your account so we can tell it is you. We
          aim to respond within 30 days. We will not treat you differently for
          exercising any of this.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="california">
        <p>
          If you live in California, the California Consumer Privacy Act as
          amended by the CPRA gives you rights to know what personal information
          is collected about you and how it is used and shared, to obtain a copy,
          to correct it, to delete it, to opt out of its sale or sharing, and to
          limit the use of sensitive personal information, along with a right
          not to be discriminated against for exercising them.
        </p>
        <p>
          The categories we collect, why, and who receives them are described
          throughout this policy, identifiers and contact details, commercial
          information about your bookings and payments, internet activity in the
          form of server logs and, through the Meta Pixel, the pages you visit
          here, and, where you give it to us for a trip, health information.{" "}
          <strong>
            We do not sell personal information. We do share it, as the CPRA
            uses the word, in one way: the Meta Pixel sends Meta information
            about your visits here so that we can show you our ads.
          </strong>{" "}
          You can opt out with the switch in section {sectionIndex("cookies")},
          reached from the &ldquo;Your privacy choices&rdquo; link at the foot of
          every page, and we honor Global Privacy Control signals as an opt-out.
          To make any other request, use the contact route in section{" "}
          {sectionIndex("rights")}.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="eea-uk">
        <p>
          This site is aimed at travelers in the United States, and your
          information is stored and processed there. If you are in the European
          Economic Area or the United Kingdom and the GDPR applies to our
          handling of your information, we rely on these legal bases: performance
          of a contract for booking and running your trip; legitimate interests
          for keeping the site secure and defending claims; consent for marketing
          email; and legal obligation for tax and accounting records. We do not
          run the Meta Pixel for visitors whose device is set to a European time
          zone (section {sectionIndex("cookies")}). You also
          have rights of access, rectification, erasure, restriction, portability
          and objection, and a right to complain to your data protection
          authority.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="children">
        <p>
          Outrider trips are sold to adults. This site is not directed at
          children, and we do not knowingly collect personal information from
          anyone under 18 through it. If a minor travels as part of a group, the
          adult who books provides the information about them and is responsible
          for it. If you believe a child has given us information directly, email{" "}
          {CONTACT.email} and we will delete it.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="security">
        <p>
          Traffic to this site is encrypted in transit. Passwords are hashed by
          our authentication provider and are never visible to us. Card details
          never reach our systems at all. Access to booking and payment records
          in our database is restricted by row-level security so that a signed-in
          traveler can read their own records and no one else&rsquo;s, and the
          writes that create bookings and payments are made only by the server.
        </p>
        <p>
          <strong>
            No system is perfectly secure, and we do not promise that ours is.
          </strong>{" "}
          If a breach affects your information we will notify you and the
          relevant authorities as the law requires. Use a strong, unique password
          and tell us at once if you think someone else has been in your account.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="changes">
        <p>
          We may update this policy. Each version carries a version number and
          the dates it was updated and took effect, at the top of this page.
          Where a change materially affects how we handle information we already
          hold about you, we will tell you directly rather than quietly
          republishing the page.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="contact">
        <p>
          {LEGAL_NAME}, {CONTACT.base}. Privacy questions and requests:{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
        {CONTACT.postalAddress ? (
          <p>
            Written requests can be sent to{" "}
            {CONTACT.postalAddress.join(", ")}.
          </p>
        ) : null}
        <p>
          Related documents: <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/assumption-of-risk">Assumption of Risk</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

/** Cross-reference helper, keeps "see section 8" honest when sections move. */
function sectionIndex(id: string): number {
  return PRIVACY.sections.findIndex((section) => section.id === id) + 1;
}
