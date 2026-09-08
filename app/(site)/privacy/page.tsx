import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY } from "@/lib/legal";
import { CONTACT } from "@/lib/site-content";
import LegalDocument, { LegalList, LegalSection } from "../legal/LegalDocument";

/**
 * Privacy Policy.
 *
 * Written against what the application actually does, not against a template.
 * Every claim below was checked in the code: card handling in
 * components/CheckoutForm.tsx and lib/stripe.ts, session cookies in
 * lib/supabase/middleware.ts, the waitlist and its Resend audience in
 * app/waitlist-actions.ts, the contact form in app/(site)/contact/actions.ts,
 * and the IP-keyed rate limiter in lib/rate-limit.ts. There is no analytics
 * package in this project, so the policy says there is none rather than
 * hedging.
 *
 * Where the code has no answer, a retention schedule, for instance, which
 * simply does not exist yet, the page says so in a flag instead of inventing
 * a commitment the company would then be held to.
 */

export const metadata: Metadata = {
  title: PRIVACY.title,
  description: PRIVACY.description,
};

export default function PrivacyPage() {
  return (
    <LegalDocument doc={PRIVACY}>
      <LegalSection doc={PRIVACY} id="scope">
        <p>
          This policy explains what Outrider Travel Co. (&ldquo;Outrider&rdquo;,
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
          and deposit, the booking status, your group code if you are travelling
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

        <h3>Messages you send us</h3>
        <p>
          The contact form takes your name, email address and message and emails
          them to us. It is not stored in our database, the record is the email
          in our inbox, and the reply thread that follows.
        </p>

        <h3>Waitlist</h3>
        <p>
          Joining the waitlist stores your email address, and the date you
          joined, in our database and in our mailing list at Resend. Nothing
          else.
        </p>

        <h3>Technical information</h3>
        <p>
          Like any website, ours receives your IP address, your browser type and
          version, and the page you requested, and our host records them. See
          section {sectionIndex("logs")}.
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
              and practical information before departure;
            </>,
            <>
              answer messages you send us, and keep a record of what was agreed;
            </>,
            <>
              send trip announcements to people who joined the waitlist or
              otherwise asked for them;
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
          We do not sell your personal information, and we do not share it for
          cross-context behavioural advertising.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="cookies">
        <p>
          We use cookies for one thing: keeping you signed in. When you log in,
          Supabase sets session cookies through our server, and our middleware
          refreshes them as you move around the site so your session stays valid.
          Without them the booking area cannot know who you are.
        </p>
        <p>
          <strong>
            We do not use analytics, advertising or tracking cookies, and there
            is no third-party analytics or advertising code on this site.
          </strong>{" "}
          Nobody is being profiled here, and there is nothing to opt out of.
        </p>
        <p>
          Stripe sets its own cookies on pages where you enter card details, to
          detect fraud and to make its payment form work. Those are Stripe&rsquo;s
          and are governed by its policy.
        </p>
        <p>
          You can block or delete cookies in your browser. If you block ours, you
          will not be able to stay signed in, and the booking pages will not
          work.
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
          request to verify a payment with your bank, and pre-departure
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
          The waitlist and contact forms are open to anyone, so both are rate
          limited. To do that we store a short-lived record keyed to the IP
          address the request came from, counting how many submissions it has
          made in the past hour. It is used for nothing else, not for
          analytics, not for profiling, not for advertising.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="sharing">
        <p>We share personal information with four kinds of recipient.</p>

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
          ]}
        />

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
          while your account exists. Waitlist addresses are kept until you
          unsubscribe or ask us to remove you.
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
          to correct it, to delete it, and to limit the use of sensitive personal
          information, along with a right not to be discriminated against for
          exercising them.
        </p>
        <p>
          The categories we collect, why, and who receives them are described
          throughout this policy, identifiers and contact details, commercial
          information about your bookings and payments, internet activity in the
          form of server logs, and, where you give it to us for a trip, health
          information. <strong>
            We do not sell personal information and we do not share it for
            cross-context behavioural advertising.
          </strong>{" "}
          To make a request, use the contact route in section{" "}
          {sectionIndex("rights")}.
        </p>
      </LegalSection>

      <LegalSection doc={PRIVACY} id="eea-uk">
        <p>
          This site is aimed at travellers in the United States, and your
          information is stored and processed there. If you are in the European
          Economic Area or the United Kingdom and the GDPR applies to our
          handling of your information, we rely on these legal bases: performance
          of a contract for booking and running your trip; legitimate interests
          for keeping the site secure and defending claims; consent for marketing
          email; and legal obligation for tax and accounting records. You also
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
          traveller can read their own records and no one else&rsquo;s, and the
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
          Outrider Travel Co., {CONTACT.base}. Privacy questions and requests:{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
        <p>
          Related documents: <Link href="/terms">Terms of Service</Link> ·{" "}
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
