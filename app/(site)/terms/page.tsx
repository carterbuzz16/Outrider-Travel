import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { TERMS } from "@/lib/legal";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import { DEPOSIT_PERCENTAGE, PAY_IN_FULL_DISCOUNT } from "@/lib/deposit";
import { BALANCE_PAYMENT_HOLD_HOURS, INSTALLMENT_OFFSETS_DAYS } from "@/lib/installments";
import { MAX_INSTALLMENT_ATTEMPTS, INSTALLMENT_RETRY_AFTER_DAYS } from "@/lib/payments";
import { MIN_BALANCE_PAYMENT, formatAmount } from "@/lib/balance";
import LegalDocument, { LegalList, LegalSection } from "../legal/LegalDocument";

/**
 * Terms of Service.
 *
 * The payment mechanics described here are not invented: the deposit
 * percentage, the pay-in-full discount, the installment schedule, the early
 * payment minimum, the retry rules and the SCA behavior are all imported from
 * or read directly out of lib/deposit.ts, lib/balance.ts, lib/installments.ts,
 * lib/payments.ts, app/(protected)/bookings/actions.ts and
 * app/api/cron/charge-installments.
 * Importing the constants rather than typing the numbers means the document
 * cannot quietly go stale when the code changes, if someone moves the
 * installment offsets, this page moves with them.
 *
 * What is NOT settled is business policy: refund windows, whether the deposit
 * is refundable, the governing-law state, transfer fees. Those are marked with
 * stated as fact in the rendered page.
 */

export const metadata: Metadata = pageMetadata({
  title: TERMS.title,
  path: "/terms",
  description: TERMS.description,
});

const depositPercent = Math.round(DEPOSIT_PERCENTAGE * 100);
const [firstOffset, secondOffset] = INSTALLMENT_OFFSETS_DAYS;
// Zero switches the discount off (lib/deposit.ts), and then the Terms must not
// promise one: every sentence that mentions it is conditional on this.
const payInFullDiscount = PAY_IN_FULL_DISCOUNT > 0 ? formatAmount(PAY_IN_FULL_DISCOUNT) : null;
const minimumEarlyPayment = formatAmount(MIN_BALANCE_PAYMENT);
// The text line, from the same env var the emails use. Left out of the SMS
// section until it is set, rather than printing a placeholder number.
const smsNumber = process.env.SMS_NUMBER?.trim() || null;

export default function TermsPage() {
  return (
    <LegalDocument doc={TERMS}>
      <LegalSection doc={TERMS} id="about">
        <p>
          These Terms of Service are the agreement between you and{" "}
          {LEGAL_NAME} (&ldquo;Outrider&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;), a travel company based in {CONTACT.base}, covering
          your use of this website and any trip you book through it.
        </p>
        <p>
          They apply together with two other documents, which form part of this
          agreement:{" "}
          <Link href="/privacy">the Privacy Policy</Link>, and{" "}
          <Link href="/assumption-of-risk">
            the Assumption of Risk, Release and Waiver of Liability
          </Link>
          . Read all three. If you do not accept them, do not book a trip.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="eligibility">
        <p>
          To book a trip you must be at least 18 years old, able to enter into a
          binding contract, and booking for yourself or for someone who has
          authorized you to accept these terms on their behalf.
        </p>
        <p>
          Booking requires an Outrider account. Keep the email address on it
          current: it is where booking confirmations, payment receipts and
          notices about failed payments are sent, and a missed notice does not
          suspend anything this agreement requires of you. You are responsible
          for what happens under your account, and for keeping your password to
          yourself.
        </p>
        <p>
          Everything you tell us at booking, names as they appear on
          identification, dates of birth, ability level, dietary needs, medical
          conditions relevant to the trip, emergency contacts, must be accurate
          and complete. Lodging, lift tickets and rental equipment are booked
          against that information, and corrections after the fact are subject
          to whatever the supplier allows and charges.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="trips-and-tiers">
        <p>
          Each departure is offered in tiers. A tier has its own price and its
          own list of what is included, lodging and room type, lift tickets,
          rental equipment, transport, private events, staffing, and on some
          tiers extras such as a private instructor, a chef, a spa treatment or
          a welcome package. The inclusions shown on a trip page at the moment
          you book are the ones that apply to your booking.
        </p>
        <p>
          <strong>Anything not listed as included is not included.</strong> As a
          general matter that means airfare and travel to and from the departure
          city, meals other than those named, incidentals, resort and hotel
          incidentals charged to your room, gratuities, personal equipment,
          lessons other than those named, medical costs, and anything you buy on
          your own account during the trip.
        </p>
        <p>
          Prices are in US dollars. A tier has limited capacity and is sold
          first come, first served; a spot is held once a booking is created and
          released if the booking is cancelled. We may correct an obvious pricing
          or description error before a booking is confirmed, and if we do, you
          may take the corrected price or cancel for a full refund of anything
          already charged.
        </p>
        <p>
          Itineraries are plans, not promises about a specific day. Lift
          operations, terrain openings, activity timings, event schedules and
          room assignments within a booked category may change, and the trip is
          still the trip we agreed to sell you if the substance of what is
          included is delivered.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="booking-and-deposit">
        <h3>What happens when you book</h3>
        <p>
          When you book, you choose how to pay: the deposit now and the balance
          in installments, or the whole trip at once. Choosing a trip, a tier
          and one of those two options creates a booking in a{" "}
          <strong>pending</strong> state and holds a spot in that tier while you
          pay. A booking is not confirmed until that first payment has actually
          been captured by our payment processor. Until then the spot can be
          released.
        </p>

        <h3>The deposit</h3>
        <p>
          The deposit is <strong>{depositPercent}% of the tier price</strong>,
          rounded to the cent, and is charged at the time of booking. Once it is
          captured, the booking moves to <strong>deposit paid</strong>, your
          spot is confirmed, and the balance is scheduled as installments (see
          section {sectionIndex("payment-plan")}). The deposit is
          non-refundable, as set out in section {sectionIndex("cancellation")}.
        </p>
        <p>
          The card you use to pay the deposit is saved with our payment
          processor and set as the card your future installments are charged to.
          You can tell us to use a different card by contacting {CONTACT.email}.
        </p>

        <h3>Paying in full at booking</h3>
        <p>
          You may instead pay the whole price of the trip in one payment when you
          book.{" "}
          {payInFullDiscount ? (
            <>
              If you do, <strong>{payInFullDiscount} comes off the tier price</strong>,
              and the discounted figure is the total price of your booking.{" "}
              <strong>
                The discount is only available at the moment you book.
              </strong>{" "}
              It does not apply if you choose the deposit and later pay the
              balance off early (see section {sectionIndex("payment-plan")}),
              and it cannot be added to a booking after it is made.
            </>
          ) : (
            <>The price is the same as on the installment plan.</>
          )}
        </p>
        <p>
          Once that payment is captured, the booking moves straight to{" "}
          <strong>paid in full</strong> and no installments are scheduled.
          Because nothing is charged later, the card you pay with is not saved
          for future charges.
        </p>
        <p>
          <strong>
            {depositPercent}% of the total price you pay is treated as the
            deposit
          </strong>
          , exactly as if you had paid the deposit and the balance separately,
          and is non-refundable in the same way. The rest of what you paid is
          treated as paid above the deposit, and the refund schedule in section{" "}
          {sectionIndex("cancellation")} applies to it.
        </p>

        <h3>Authorizing the charges</h3>
        <p>
          Before you pay, the payment page asks you to tick a box agreeing to
          these terms and to the Assumption of Risk, and authorizing the charge
          being made that day. On the deposit plan the same box also
          authorizes Outrider to charge each scheduled installment to the saved
          card automatically, on the dates and in the amounts shown on that page,
          without asking you again. That authorization also covers a retry of a
          declined installment under section {sectionIndex("failed-payments")},
          and any installment as reduced by an early payment under section{" "}
          {sectionIndex("payment-plan")}. It ends when the balance is paid or the
          booking is cancelled. You cannot pay without giving it.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="payment-plan">
        <h3>How the balance is collected</h3>
        <p>
          The balance of the tier price after the deposit is split into{" "}
          <strong>{INSTALLMENT_OFFSETS_DAYS.length} equal installments</strong>{" "}
          (the last absorbing any rounding remainder, so the installments sum
          exactly to the balance). They are due on fixed dates measured from the
          first day of the trip:
        </p>
        <LegalList
          items={[
            <>
              <strong>{firstOffset} days before the trip starts</strong>, first
              installment.
            </>,
            <>
              <strong>{secondOffset} days before the trip starts</strong>, second installment, which clears the balance.
            </>,
          ]}
        />
        <p>
          The schedule is anchored to the trip, not to the day you booked. If
          you book fewer than {firstOffset} days before departure, one or both
          installment dates are already in the past, and those installments will
          be charged on the next daily run after your deposit is confirmed
          rather than being spread out. Booking close to departure therefore
          means paying most or all of the price straight away.
        </p>

        <h3>Automatic charges</h3>
        <p>
          <strong>
            Installments are charged automatically, without further action from
            you, to the card saved when you paid your deposit.
          </strong>{" "}
          A job runs once a day, finds installments that are due, and charges
          them off-session, that is, with no checkout page and nobody present.
          You will get an email each time an installment is charged, showing the
          amount and the remaining balance. You will not be asked to approve
          each charge, which is the whole point of the plan: you authorized
          them when you paid the deposit (see section{" "}
          {sectionIndex("booking-and-deposit")}).
        </p>
        <p>
          When the payments that have gone through add up to the booking&rsquo;s
          total price, the booking moves to <strong>paid in full</strong> and
          nothing further is charged.
        </p>

        <h3>Paying ahead</h3>
        <p>
          While a booking is <strong>deposit paid</strong>, you can pay toward
          the balance early from your bookings page, at any time. You can pay
          everything still owed, or any amount
          from <strong>{minimumEarlyPayment}</strong> up to what you owe (if you
          owe less than {minimumEarlyPayment}, the whole of it). You cannot pay
          more than you owe. An early payment is charged to whichever card you
          enter at the time, and that card is not saved for later charges.
        </p>
        <p>
          <strong>
            An early payment reduces your scheduled installments, earliest first.
          </strong>{" "}
          Once it goes through, it comes off the next installment due; an
          installment it covers completely is cancelled, and one it covers only
          in part is reduced by the amount the payment covers and is still
          charged on its original date. Any installment still scheduled after that keeps its date and
          amount, and is charged automatically to the card saved with your
          deposit. An early payment also covers an installment that has been
          declined or is waiting for bank verification. When nothing is left to
          pay, the booking moves to <strong>paid in full</strong>.
        </p>
        <p>
          Paying ahead does not change the price of your booking.
          {payInFullDiscount && (
            <>
              {" "}
              The {payInFullDiscount} discount in section{" "}
              {sectionIndex("booking-and-deposit")} is not available for
              paying the balance early, even all at once.
            </>
          )}{" "}
          Money paid ahead is treated as paid above the deposit under section{" "}
          {sectionIndex("cancellation")}.
        </p>
        <p>
          So that the same balance is never collected twice, a scheduled
          installment is not charged while an early payment you have started is
          still open. An early payment left unfinished for more than{" "}
          {BALANCE_PAYMENT_HOLD_HOURS} hours is cancelled, and the installment is
          then charged as normal, so starting one can delay an installment by up
          to {BALANCE_PAYMENT_HOLD_HOURS} hours but never stops it.
        </p>

        <h3>If you pay more than you owe</h3>
        <p>
          In rare cases two payments can go through at nearly the same moment,
          for example an early payment and a scheduled installment, and together
          take more than the booking&rsquo;s total price. If that happens,{" "}
          <strong>
            we refund the amount paid over the total automatically, in full, to
            the card it was charged to.
          </strong>{" "}
          You do not need to ask for it. That excess is not part of the deposit,
          is not subject to the refund schedule in section{" "}
          {sectionIndex("cancellation")}, and is not held as credit. How quickly
          the refund appears on your statement depends on your card issuer.
        </p>
        <p>
          Keep a valid card on file. If the saved card expires, is replaced, is
          reported lost, or is cancelled by your bank, the charge will fail and
          section {sectionIndex("failed-payments")} applies. Telling us about a
          new card before an installment is due is the traveler&rsquo;s
          responsibility.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="failed-payments">
        <h3>If an installment is declined</h3>
        <p>
          If a scheduled charge is declined, we email you and try again. The
          retry rules are fixed:
        </p>
        <LegalList
          items={[
            <>
              We attempt a declined installment at most{" "}
              <strong>{MAX_INSTALLMENT_ATTEMPTS} times</strong> in total.
            </>,
            <>
              A retry happens no sooner than{" "}
              <strong>{INSTALLMENT_RETRY_AFTER_DAYS} days</strong> after the
              previous failed attempt.
            </>,
            <>
              After the final failed attempt we{" "}
              <strong>stop retrying automatically</strong>. The installment is
              marked failed, the booking is flagged for us to deal with by hand,
              and it is then on you to settle it another way.
            </>,
          ]}
        />
        <p>
          An unpaid balance does not cancel your booking on its own, nothing in
          the system cancels a booking for non-payment, but it does put the
          booking in breach, and we may cancel it under this section.
        </p>

        <h3>If your bank asks for verification</h3>
        <p>
          Some cards, and most cards issued outside the United States, require
          the cardholder to authenticate a payment personally, 3-D Secure, or
          strong customer authentication. An automatic charge cannot satisfy
          that, because there is nobody at the keyboard.
        </p>
        <p>
          When it happens, the installment is put into an{" "}
          <strong>action required</strong> state and we email you a link to a
          page where you can complete the verification with your bank. This is
          treated differently from a decline in three ways that matter to you:
          it does <strong>not</strong> count as a failed attempt, it is{" "}
          <strong>not</strong> retried automatically (a repeat off-session
          attempt would fail the same way), and the payment simply waits for you.
          Until you complete it, that installment is unpaid, and if it stays
          unpaid the rest of this section applies.
        </p>
      </LegalSection>

      {/*
        CANCELLATION & REFUND POLICY
        ---------------------------------------------------------------------
        ⚠️  ATTORNEY REVIEW REQUIRED BEFORE LAUNCH. This section is written to
        Carter's specification and is deliberately plain rather than dense,
        because it is the section travelers actually read. It is still binding
        language and must be reviewed by a licensed attorney before it is
        treated as final, in particular:

          • The MISSED-INSTALLMENT clause, which converts a failed payment into
            a traveler-initiated cancellation and forfeits money already paid.
            Automatic forfeiture triggered by a payment failure is the clause
            most likely to be challenged, and the cure period is still a
            placeholder pending Carter's decision.
          • The FORCE MAJEURE clause, and whether "full refund OR full credit,
            at Outrider's discretion" is enforceable in the states travelers
            book from. Some jurisdictions require a cash refund and will not
            let an operator satisfy the obligation with credit alone.

        Also unresolved: nothing in the booking flow currently records that a
        traveler accepted these terms, so there is no evidence of assent to
        point at if this is ever disputed.
      */}
      <LegalSection doc={TERMS} id="cancellation">

        <p>
          This policy applies to every Outrider trip unless the trip&rsquo;s own
          page states different terms, in which case the terms on that page
          govern that trip. The version of this policy in effect on the day you
          book is the version that governs your booking; Outrider may update it
          for future bookings, and doing so will not change terms you have
          already booked under.
        </p>

        <h3>1. Your deposit is non-refundable</h3>
        <p>
          The deposit is <strong>non-refundable under all circumstances</strong>{" "}
          once paid. It secures your spot and covers commitments Outrider makes
          on your behalf to lodging and vendors that we cannot recover once
          made.
        </p>
        <p>
          The same applies if you paid in full at booking: {depositPercent}% of
          the total price you paid is the deposit, and that part is
          non-refundable under all circumstances once paid (see section{" "}
          {sectionIndex("booking-and-deposit")}).
        </p>

        <h3>2. Refunds on everything paid above the deposit</h3>
        <p>
          If you cancel, the amount you have paid <em>beyond</em> the deposit is
          refunded on this schedule, measured from the day we receive your
          cancellation to the first day of the trip:
        </p>
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Refund schedule for amounts paid above the deposit
            </caption>
            <thead>
              <tr className="border-b border-[--rule-strong]">
                <th scope="col" className="t-micro py-3 pr-6 text-[--text]">
                  When you cancel
                </th>
                <th scope="col" className="t-micro py-3 text-[--text]">
                  Refunded above the deposit
                </th>
              </tr>
            </thead>
            <tbody className="font-body text-body-s">
              <tr className="border-b border-[--rule]">
                <th scope="row" className="py-4 pr-6 font-normal text-[--text]">
                  60 or more days before departure
                </th>
                <td className="py-4 text-[--text-secondary]">
                  <strong className="text-[--text]">100%</strong> of the amount
                  paid above the deposit
                </td>
              </tr>
              <tr className="border-b border-[--rule]">
                <th scope="row" className="py-4 pr-6 font-normal text-[--text]">
                  30 to 59 days before departure
                </th>
                <td className="py-4 text-[--text-secondary]">
                  <strong className="text-[--text]">50%</strong> of the amount
                  paid above the deposit
                </td>
              </tr>
              <tr>
                <th scope="row" className="py-4 pr-6 font-normal text-[--text]">
                  Fewer than 30 days before departure
                </th>
                <td className="py-4 text-[--text-secondary]">
                  <strong className="text-[--text]">No refund</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The deposit is forfeited in every row above. Not showing up, arriving
          late, leaving early or being removed from a trip is treated as a
          cancellation of fewer than 30 days and carries no refund and no credit
          for unused nights, lift days, meals or activities.
        </p>
        <p>
          &ldquo;Paid above the deposit&rdquo; means every payment that has gone
          through on the booking other than the deposit itself: installments,
          early payments made from your bookings page, and, on a booking paid in
          full at booking, the rest of that payment. It is always the amount you
          actually paid
          {payInFullDiscount
            ? ", so a booking paid in full is refunded on its discounted price, and a discount is never paid out as money"
            : ""}
          . An accidental
          overpayment is not part of it: it is refunded in full, separately, as
          described in section {sectionIndex("payment-plan")}.
        </p>

        <h3>3. Missed installment payments</h3>
        <p>
          If a scheduled installment is missed and not resolved within{" "}
          <strong>10 days</strong>, the booking is treated as{" "}
          <strong>cancelled by you</strong>, and the refund schedule above
          applies based on the date of that cancellation.
        </p>

        <h3>4. If one person cancels out of a group</h3>
        <p>
          Only costs that are attributable to you individually, a single lift
          ticket, one set of rentals, are eligible for a refund under the
          schedule above.
        </p>
        <p>
          <strong>
            Shared group components are non-refundable: lodging, group
            transport, and group events and experiences.
          </strong>{" "}
          Those are booked and paid for as a whole, and the rest of your group
          continues to use them whether or not you travel.
        </p>

        <h3>5. If Outrider cancels the trip</h3>
        <p>
          If Outrider cancels a departure, for weather, a vendor failure,
          insufficient group size, or other unforeseen circumstances, you will
          receive, at Outrider&rsquo;s discretion, either a{" "}
          <strong>full refund of all amounts paid</strong> (the deposit
          included) or a <strong>full credit toward a future Outrider trip</strong>.
        </p>

        <h3>6. Force majeure</h3>
        <p>
          Outrider is not liable for any failure to perform caused by
          circumstances beyond its reasonable control, including natural
          disasters, government travel restrictions, pandemic, and resort or
          venue closure. Where such circumstances prevent a trip from running,
          the terms in section 5 above apply.
        </p>

        <h3>7. Travel insurance</h3>
        <p>
          <strong>
            We strongly recommend buying third-party travel insurance when you
            book.
          </strong>{" "}
          Outrider does not refund outside this policy for circumstances
          personal to you, illness, injury, a work conflict, a missed flight, a
          family emergency or a change of plans. Insurance is what covers those,
          and most policies must be purchased close to the date of your first
          payment to cover pre-existing conditions or offer cancel-for-any-reason
          protection.
        </p>

        <h3>How to cancel</h3>
        <p>
          You can cancel yourself from your bookings page while a booking is{" "}
          <strong>pending</strong> or <strong>deposit paid</strong>. Doing so
          releases the spot and{" "}
          <strong>immediately stops every future installment</strong>. A booking
          already <strong>paid in full</strong>, whether it was paid in full at
          booking or reached that point through installments and early payments,
          cannot be cancelled online; email {CONTACT.email} and we will handle
          it.
        </p>
        <p>
          Canceling stops future charges; it does not automatically return
          money already taken. Refunds under this policy are calculated by hand
          and issued to the original card. Cancellation takes effect on the day
          we receive it, through the bookings page or in writing at{" "}
          {CONTACT.email}.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="outrider-changes">
        <p>
          We may cancel a departure. The usual reasons are that too few people
          booked it to run properly, that a supplier failed, or that conditions
          make it unsafe or pointless to run, the last of those is dealt with
          separately in section {sectionIndex("force-majeure")}.
        </p>
        <p>
          If <strong>Outrider</strong> cancels a trip for a reason that is not an
          event outside our control, you choose one of the following. This is a
          different outcome from canceling yourself, and deliberately so: you
          are not being asked to absorb a decision you did not make.
        </p>
        <LegalList
          items={[
            <>a full refund of every amount you have paid us for that trip; or</>,
            <>
              transfer of everything you have paid to another Outrider departure
              with capacity, with any difference in price refunded or collected.
            </>,
          ]}
        />
        <p>
          We may also make changes short of canceling: a change of lodging
          within the same category, a change of dates, a change of itinerary, or
          a substitution of an included element for one of comparable standard.
          Where a change is <strong>significant</strong>, a material change of
          dates, of destination, of accommodation standard, or the loss of an
          element that was a stated headline inclusion of your tier, you may
          accept it, move to another departure, or cancel for a full refund of
          amounts paid.
        </p>
        <p>
          <strong>
            In either case our responsibility is limited to the refund, credit
            or replacement described here.
          </strong>{" "}
          We do not reimburse airfare, other travel booked separately, time off
          work, or any other cost you incurred around the trip. Book refundable
          flights, or insure them.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="force-majeure">
        <p>
          Ski trips fail for weather reasons more often than for any other, and
          the honest position is that neither of us controls the mountain.
          Neither party is liable for failing to perform because of an event
          beyond its reasonable control. For an Outrider trip that includes, but
          is not limited to:
        </p>
        <LegalList
          items={[
            <>
              insufficient snow, excessive snow, rain, wind, extreme cold, or a
              resort deciding not to open terrain or to open less of it than
              usual;
            </>,
            <>
              avalanche, avalanche-control closures, slide paths running over
              access roads, and mountain rescue operations;
            </>,
            <>
              closure of a mountain pass, highway, airport or rail line; flight
              cancellations, delays and diversions;
            </>,
            <>
              lift closures, lift breakdowns, power failures, and resort closure
              for any reason;
            </>,
            <>
              wildfire, flood, earthquake, storm and other natural events;
            </>,
            <>
              epidemic or pandemic, quarantine, and government orders restricting
              travel, gatherings or business operations;
            </>,
            <>
              war, civil unrest, terrorism, strike, labour dispute, or supplier
              insolvency.
            </>,
          ]}
        />
        <p>
          <strong>
            A trip is not cancelled or refundable simply because conditions are
            poor.
          </strong>{" "}
          Thin coverage, closed terrain, rain on the lower mountain, a lift on
          hold, a delayed flight or a road closed for part of a day are ordinary
          risks of a winter trip and are yours to bear. What this section covers
          is an event that makes the trip impossible or unsafe to run.
        </p>
        <p>
          Where it does, we will try in this order: to run the trip in an amended
          form, to reschedule it, to offer a credit against a future departure,
          and finally to refund.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="suppliers">
        <p>
          Outrider designs, sells and staffs the trip. The individual services
          inside it are provided by independent third parties: hotels and
          lodging operators, ski resorts and lift-ticket vendors, rental and
          demo shops, ski instructors and guides, shuttle and private car
          operators, chefs and caterers, spas, venues, airlines and insurers.
        </p>
        <p>
          Those suppliers are not our employees or our agents. They control their
          own operations, their own safety practices and their own staff, and
          their own terms and conditions apply to you when you use their
          services, a lift ticket, a rental agreement and a hotel registration
          card each carry their own contract, including their own liability
          waivers, which you enter into directly with them.
        </p>
        <p>
          <strong>
            We are not liable for the acts, omissions, negligence, defaults or
            failures of any third-party supplier
          </strong>{" "}, including injury, illness, death, delay, loss or damage to property
          arising from services they provide. We select suppliers with care and
          we will help you pursue a complaint against one, but the claim is
          yours and it lies against them.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="insurance">
        <p>
          <strong>Outrider does not provide travel insurance, and no package
          includes it.</strong>{" "}
          Nothing in a trip&rsquo;s inclusions should be read as cover for your
          trip, your health, your belongings or your ability to travel.
        </p>
        <p>
          We strongly recommend buying third-party travel insurance at the time
          you book. The cancellation terms in{" "}
          <a href="#cancellation">Cancellation and refunds</a> are the whole of
          what Outrider refunds. Insurance is what covers the rest: illness,
          injury, a work conflict, a family emergency, a missed connection, lost
          baggage, or medical costs on the mountain.
        </p>
        <p>
          Buy it early. Most policies only cover a pre-existing condition, or
          offer cancel-for-any-reason protection, when they are purchased within
          a short window of your first payment.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="groups-and-transfers">
        <h3>Group codes</h3>
        <p>
          Every booking is issued a six-character group code, and you can enter
          someone else&rsquo;s code when booking the same trip to be grouped with
          them. A group code is a rooming and planning device: it tells us who
          wants to travel together.
        </p>
        <p>
          <strong>
            It does not create a joint booking or any shared liability.
          </strong>{" "}
          Each traveler has their own booking, pays for it on their own card,
          whether by deposit and installments or in full, and can cancel
          independently of
          everyone else in the group. One person canceling does not cancel
          anyone else, does not change what anyone else owes, and does not
          entitle anyone else to a refund. Being in a group does not guarantee a
          specific room, a specific room-mate or a specific suite: those depend
          on the tier booked and on availability.
        </p>

        <h3>Transfers and name changes</h3>
        <p>
          A booking is personal to the traveler named on it. You cannot resell
          it or transfer it privately.
        </p>
        <p>
          We will try to accommodate a substitution, someone taking your place
          on the same trip and tier, subject to what each supplier allows.
          Lodging can usually be renamed; lift tickets and rental reservations
          often can, but not always; insurance may need to be reissued and may
          not be transferable at all. Any supplier charge is passed on to you.
          Substitutions are arranged by emailing {CONTACT.email}; there is no
          way to do it yourself on the site.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="conduct">
        <p>
          These are small groups in shared accommodation in the mountains. What
          one person does affects everyone, and Outrider staff have final say on
          the ground.
        </p>
        <p>You agree that you will:</p>
        <LegalList
          items={[
            <>
              follow the instructions of Outrider staff, guides, instructors,
              drivers and resort personnel, and follow resort rules, posted
              closures, rope lines and the skier responsibility code;
            </>,
            <>
              ski or ride within your ability and in control, and not enter
              closed or out-of-bounds terrain;
            </>,
            <>
              treat other travelers, staff, suppliers and their property with
              respect, and not harass, threaten or endanger anyone;
            </>,
            <>
              keep your alcohol and any other substance use to a level that does
              not endanger you or anyone else, and not ski or ride impaired;
            </>,
            <>
              be on time for scheduled departures, transport will not wait
              indefinitely, and getting yourself to the next point is then your
              cost and your problem.
            </>,
          ]}
        />
        <p>
          <strong>
            We may remove you from a trip, immediately and without a refund,
          </strong>{" "}
          if in our reasonable judgment your behavior endangers you or anyone
          else, is seriously disruptive, is unlawful, or is likely to damage
          property or Outrider&rsquo;s relationship with a supplier. If you are
          removed, getting home is at your own cost, and you remain liable for
          damage you caused and for any charge a supplier passes to us because
          of you, including damage to accommodation.
        </p>
        <p>
          You are also responsible for your own health and fitness for the trip,
          and for telling us before departure about any medical condition,
          medication, allergy or limitation that could affect your safety or
          ours. Section {sectionIndex("risk")} and the assumption of risk
          document cover this in more detail.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="risk">
        <p>
          Skiing, snowboarding and mountain travel are dangerous activities that
          injure and kill people every season. Those risks cannot be eliminated
          by anything Outrider does, and they are an inherent part of what you
          are buying.
        </p>
        <p>
          By booking a trip you confirm that you have read and accept{" "}
          <Link href="/assumption-of-risk">
            the Assumption of Risk, Release and Waiver of Liability
          </Link>, which forms part of this agreement and which every traveler is
          required to sign before departure. Read it. It asks you to accept
          those risks and to give up legal claims, and it is written to be
          understood rather than hidden.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="liability">
        <p>
          <strong>
            To the fullest extent permitted by law, Outrider is not liable for
            indirect, incidental, special, consequential, exemplary or punitive
            damages
          </strong>{" "}, including lost profits, lost enjoyment, lost time, and the cost of
          travel or accommodation you booked separately, arising out of or
          relating to this agreement or a trip, whether the claim is in contract,
          tort or otherwise, and whether or not we were told such loss was
          possible.
        </p>
        <p>
          <strong>
            To the fullest extent permitted by law, our total liability to you
            for any claim arising out of or relating to this agreement or a trip
            is limited to the amount you actually paid Outrider for the trip
            giving rise to the claim.
          </strong>
        </p>
        <p>
          Nothing in this agreement excludes or limits liability that cannot be
          excluded or limited by law, including liability for death or personal
          injury caused by our own negligence where the applicable law does not
          permit that to be excluded, or for fraud.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="site">
        <p>
          The Outrider name, logo, photography, copy and design are ours or our
          licensors&rsquo;, and are protected by copyright and trade mark law. You
          may use this site to look at trips and manage your own bookings. You
          may not copy, scrape, resell or republish its content, interfere with
          it, attempt to access anyone else&rsquo;s account or data, or use it in
          any way that breaks the law.
        </p>
        <p>
          The site is provided as it is. We try to keep it accurate and
          available, but we do not warrant that it will be uninterrupted,
          error-free, or that every price, date, image or availability figure is
          correct at every moment. Where an obvious error is shown, section{" "}
          {sectionIndex("trips-and-tiers")} applies.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="governing-law">
        <p>
          If something goes wrong, tell us first. Most things are fixable, and we
          would rather fix them than argue about them. Email {CONTACT.email} with
          the detail and give us thirty days to resolve it before starting any
          formal process.
        </p>
        <p>
          If any part of this agreement is held unenforceable, that part is
          limited or removed to the minimum extent necessary and the rest stays
          in force. Our not enforcing a term on one occasion does not waive it.
          This agreement, together with the Privacy Policy, the assumption of
          risk document, and the trip and tier details shown when you booked, is
          the entire agreement between us about your trip.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="changes">
        <p>
          We may update these terms. Every version carries a version number and
          the dates it was updated and took effect, shown at the top of this
          page.
        </p>
        <p>
          <strong>
            The version in force when you booked is the version that applies to
            that booking.
          </strong>{" "}
          A later change does not reach back into a booking already made. Where a
          change materially affects what you owe or what you can claim, we will
          tell travelers with live bookings and, where it applies to their
          booking, ask them to accept it.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="sms">
        <p>
          <strong>Outrider trip texts</strong> is our text-message program for
          travelers. If you tick the text-message box on your trip page, we send
          automated texts about your trip to the mobile number you give us:
          logistics such as transfer and meeting times, reminders about payments
          and the things we need from you before you travel, and changes to
          plans. You can text us back, and a person replies.
        </p>
        <LegalList
          items={[
            <>Message frequency varies.</>,
            <>Message and data rates may apply.</>,
            <>
              Reply <strong>HELP</strong> for help, or email{" "}
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              {smsNumber ? <>, or text {smsNumber}</> : null}.
            </>,
            <>
              Reply <strong>STOP</strong> to cancel at any time. You will get one
              message confirming it, and no more after that unless you opt in
              again. Any other reasonable request to stop, by text or by email,
              is honored the same way.
            </>,
            <>
              Consent to receive texts is not a condition of booking or of any
              purchase. The box is separate from your acceptance of these terms,
              and it is never ticked for you.
            </>,
            <>Carriers are not liable for delayed or undelivered messages.</>,
          ]}
        />
        <p>
          How we handle your mobile number and your consent is set out in{" "}
          <Link href="/privacy#sms">the Privacy Policy</Link>. We do not share
          either with third parties for their marketing.
        </p>
      </LegalSection>

      <LegalSection doc={TERMS} id="contact">
        <p>
          {LEGAL_NAME}, {CONTACT.base}. Questions about these terms, a
          booking, a cancellation or a payment:{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
        <p>
          Related documents: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/assumption-of-risk">Assumption of Risk</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

/** Cross-reference helper, keeps "see section 7" honest when sections move. */
function sectionIndex(id: string): number {
  return TERMS.sections.findIndex((section) => section.id === id) + 1;
}
