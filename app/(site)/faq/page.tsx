import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { FaqSchema, Reveal, SectionDivider, WaitlistCTA } from "@/components/ui";
import { CONTACT, SPRING_BREAK_WHEN } from "@/lib/site-content";
import { BOOKINGS_OPEN, TRIP_DETAILS_OPEN } from "@/lib/booking-window";
import { DEPOSIT_AMOUNT, KLARNA_PAY_IN_4_MAX, PAY_IN_FULL_DISCOUNT } from "@/lib/deposit";
import { flightTimesPublished } from "@/lib/trip-logistics";
import { SPRING_BREAK_DATES_CONFIRMED, howTheRestIsPaid } from "@/lib/installments";
import { SPRING_BREAK_STARTS } from "@/lib/signup-deadline";
import { SPRING_BREAK_TERMS } from "@/lib/spring-break-terms";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  path: "/faq",
  description:
    "How an Outrider college trip works: what the price covers, deposits and installments, canceling, flights, and the details of Telluride and spring break.",
  shareTitle: "Questions about Outrider trips",
});

/* Answers deliberately do not restate installment dates, the pay-in-full
 * discount or refund windows. Those live in the Terms and are computed from the
 * booking data, and an FAQ that quotes a number the contract later changes is
 * worse than one that points at the contract. Anything with money or liability
 * in it links to the clause instead. The exceptions are read from the same
 * constants checkout uses, so they cannot drift from it: the deposit
 * (DEPOSIT_AMOUNT), Klarna's Pay in 4 cap (KLARNA_PAY_IN_4_MAX) and the
 * pay-in-full discount, and since 27 October 2026 (Carter's brief) each
 * departure's balance dates, which howTheRestIsPaid reads from
 * INSTALLMENT_DATES_BY_START (lib/installments.ts), so December's single
 * payment on the signup deadline is named. Carter's two sentences about deposits and missed
 * installments (13 October 2026) are quoted as he wrote them. The group sizes
 * restate each departure's capacity (lib/trip-logistics.ts).
 *
 * Split on 3 November 2026 into what holds on every trip and what belongs to
 * one, now that spring break is a trip rather than a teaser. A fact true of one
 * trip goes in that trip's group. Spring break's price is left to its page, which
 * reads it from the published trips, and it has no group-size answer because
 * Carter has not given its capacity. Its payment dates are still to be confirmed,
 * so they only ever come through howTheRestIsPaid. A question names its trip
 * where another group asks the same thing, because FaqSchema lists them all as
 * one page and each has to stand alone in a search result. */
type QA = { q: string; a: React.ReactNode };
type Group = { id: string; heading: string; items: QA[] };

const GROUPS: Group[] = [
  {
    id: "every-trip",
    heading: "Every trip",
    items: [
      {
        q: "What is actually included in the price?",
        a: (
          <>
            On every trip: your room, your rides from the airport and back, and
            our team on site the whole time. Telluride adds lift tickets, rentals
            and the après party, and spring break is all-inclusive. Each
            trip&rsquo;s full list is below. You book your own flights. Travel
            insurance isn&rsquo;t included. We&rsquo;ll offer it as an optional
            add-on.
          </>
        ),
      },
      {
        q: "How does paying work?",
        a: (
          <>
            ${DEPOSIT_AMOUNT} holds your spot. The rest comes off the card you
            booked with automatically, before the trip, on the dates set for your
            week (they&rsquo;re under each trip below). You can pay toward it
            early from your bookings page any time, which brings the next payment
            down. Or pay for the whole trip when you book
            {PAY_IN_FULL_DISCOUNT > 0 && `, take $${PAY_IN_FULL_DISCOUNT} off,`} and
            nothing is charged later. Klarna works for either one payment: the
            whole trip when you book, or everything left after the deposit,
            from your bookings page. It splits it into 4 on packages up to{" "}
            {`$${KLARNA_PAY_IN_4_MAX.toLocaleString("en-US")}`} and over time
            above that. Everyone books and pays for their own spot, so nobody fronts
            money for friends or spends the spring chasing a group chat.
            Deposits are non-refundable
            {SPRING_BREAK_DATES_CONFIRMED ? `, except on spring break: ${SPRING_BREAK_TERMS.paragraphs[0]}` : "."} If an
            installment is missed, your spot may be released. The deposit and paying in full are set out in{" "}
            <Link href="/terms#booking-and-deposit" className="text-[--accent] underline underline-offset-4">
              the booking section of the Terms
            </Link>
            , and the payment dates and paying ahead in{" "}
            <Link href="/terms#payment-plan" className="text-[--accent] underline underline-offset-4">
              the balance section
            </Link>
            .
          </>
        ),
      },
      {
        q: "What happens if a payment fails?",
        a: (
          <>
            We email you and try it again in a few days. If your card has
            expired or changed, get in touch with us and we&rsquo;ll update it
            before the retry. If your bank asks for an extra authentication
            step, the email has a link to finish it. A failed payment
            doesn&rsquo;t immediately cost you your spot. The retry
            schedule and the point at which a booking is at risk are in{" "}
            <Link href="/terms#failed-payments" className="text-[--accent] underline underline-offset-4">
              the Terms
            </Link>
            .
          </>
        ),
      },
      {
        q: "Can I cancel?",
        a: (
          <>
            Yes, and what you get back depends on how far out you are. The
            refund schedule is written in full in{" "}
            <Link href="/terms#cancellation" className="text-[--accent] underline underline-offset-4">
              the cancellation section of the Terms
            </Link>
            . The short version: the deposit holds a room we&rsquo;ve already
            committed to, so it doesn&rsquo;t come back, and the rest is on a
            sliding scale that narrows as the trip gets closer. Travel
            insurance isn&rsquo;t included. We&rsquo;ll offer it as an
            optional add-on.
          </>
        ),
      },
      {
        q: "Is somebody from Outrider actually there?",
        a: (
          <>
            Yes, for the whole trip. Our team is on site, so if a room needs
            fixing or a plan changes, someone is right there to sort it out.
          </>
        ),
      },
      {
        q: "Is this a party trip?",
        a: (
          <>
            It&rsquo;s a fun week, and we plan it that way. It&rsquo;s also
            built around the place: a hotel you&rsquo;d show your parents,
            somewhere worth the flight, and our team there the whole time.
          </>
        ),
      },
      {
        q: "What should my parents know?",
        a: (
          <>
            Our team is on site the whole trip. Everyone stays at one hotel: The
            Peaks in Telluride, ski-in, ski-out, or Zemi Miches, a Hilton Curio
            Collection resort, for spring break. At The Peaks, rooms are
            same-gender. We collect an emergency contact for every traveler
            before the trip.
            Each traveler books and pays for their own spot.
          </>
        ),
      },
      {
        q: "Are flights included?",
        a: (
          <>
            No, on purpose. Everyone is flying in from somewhere different, and
            bundling flights would mean somebody paying for a routing that suits
            someone else. You book your own, and we tell you exactly which
            airport and which arrival window to aim for.
          </>
        ),
      },
      {
        q: "Can I book with my friends?",
        a: (
          <>
            Yes. Everyone books their own spot, and a group code keeps you
            together. After you book, you name your roommates on your trip
            page. At The Peaks, rooms are same-gender.
          </>
        ),
      },
      {
        q: "When do trips go on sale?",
        a: BOOKINGS_OPEN ? (
          // Not "they're open now": that stops being true of a trip when it
          // closes, and this page has no read of the trips to know.
          <>
            When the rooms are held and the price is set. What&rsquo;s on sale
            now is on the{" "}
            <Link href="/trips" className="text-[--accent] underline underline-offset-4">
              trips page
            </Link>
            , with dates, packages and pricing. Join the list below and
            you&rsquo;ll hear about the next one first.
          </>
        ) : TRIP_DETAILS_OPEN ? (
          // Details public, paying list-only (lib/booking-window.ts).
          <>
            The list books first. Dates, packages and pricing are all on the{" "}
            <Link href="/trips" className="text-[--accent] underline underline-offset-4">
              trips page
            </Link>
            . Join the list below and we&rsquo;ll email you a private link to book.
          </>
        ) : (
          <>
            The dates are on the{" "}
            <Link href="/trips" className="text-[--accent] underline underline-offset-4">
              trips page
            </Link>
            ; packages and pricing go up when booking opens. Join the list
            below and you&rsquo;ll hear before it goes public.
          </>
        ),
      },
      {
        q: "Something else?",
        a: (
          <>
            Write to{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-[--accent] underline underline-offset-4"
            >
              {CONTACT.email}
            </a>
            . {CONTACT.responseTime}
          </>
        ),
      },
    ],
  },
  {
    id: "telluride",
    heading: "Telluride",
    items: [
      {
        q: "What's included in Telluride?",
        a: (
          <>
            Your lodging at The Peaks, ski-in, ski-out, lift tickets and ski or
            snowboard rentals, rides from the airport and back, the après party
            at Gorrono Ranch, and our team on the ground for the whole trip.{" "}
            {TRIP_DETAILS_OPEN
              ? "The number on the trip page is what the trip costs: no resort fee at check-in and no separate charge for the shuttle."
              : "No resort fee at check-in and no separate charge for the shuttle."}
          </>
        ),
      },
      {
        q: "When is the rest paid for Telluride?",
        a: <>{howTheRestIsPaid()}</>,
      },
      {
        q: "How many people are on a Telluride trip?",
        a: (
          <>
            Up to 100 in December and 50 in January. The number is set
            before a trip goes on sale and doesn&rsquo;t move to fit demand.
          </>
        ),
      },
      {
        q: "How do the rooms work in Telluride?",
        a: (
          <>
            Rooms are shared by four or by two, and a penthouse holds eight. You
            can name up to three people in a Four to a Room package and one in a
            Two to a Room, and a penthouse group rooms together.
          </>
        ),
      },
      {
        q: "Do I need to know how to ski?",
        a: (
          <>
            Not at all. Telluride has plenty of gentle terrain for a first
            timer. Lessons are available at the resort&rsquo;s rate: tell us
            when you book and we&rsquo;ll set one up before you land.
          </>
        ),
      },
      {
        q: "Which airport for Telluride?",
        a: (
          <>
            Fly into Montrose. It&rsquo;s about 65 miles out, roughly
            an hour and a half of driving, and ground transport in both
            directions is arranged and included. The{" "}
            <Link href="/flights" className="text-[--accent] underline underline-offset-4">
              flight guide
            </Link>{" "}
            {flightTimesPublished()
              ? "has the arrival and departure times and what to do about a bad connection."
              : "covers what to do about a bad connection, and we’ll post the arrival and departure times there."}
          </>
        ),
      },
    ],
  },
  {
    id: "spring-break",
    heading: "Spring break",
    items: [
      {
        q: "Where is spring break?",
        a: (
          <>
            Punta Cana, in the Dominican Republic, {SPRING_BREAK_WHEN}. We stay at
            Zemi Miches, a Hilton Curio Collection resort on Playa Esmeralda, in
            Miches, an hour and a half up the coast. It&rsquo;s all on the{" "}
            <Link href="/spring-break" className="text-[--accent] underline underline-offset-4">
              spring break page
            </Link>
            .
          </>
        ),
      },
      {
        q: "What's included in spring break?",
        a: (
          <>
            Four nights at Zemi Miches, all-inclusive, two to a room with two
            queen beds. Airport transfers both ways, a welcome happy hour, a welcome
            gift, and our team on site the whole trip, plus a few Outrider moments
            along the way. Kayaks, paddleboards, padel and pickleball are
            included too. ATV tours, catamaran days, whale watching, mini bowling
            and the spa cost extra, and we can help you book them.
          </>
        ),
      },
      {
        q: "When is the rest paid for spring break?",
        // The dates print only once they are real (lib/installments.ts).
        a: SPRING_BREAK_DATES_CONFIRMED ? (
          <>{howTheRestIsPaid(SPRING_BREAK_STARTS)}</>
        ) : (
          <>In payments before the trip. You&rsquo;ll see the dates before you pay anything.</>
        ),
      },
      {
        q: "How do the rooms work for spring break?",
        a: (
          <>
            Two to a room with two queen beds. After you book, you name the person
            you want to share with on your trip page.
          </>
        ),
      },
      {
        q: "Which airport for spring break?",
        a: (
          <>
            Fly into Punta Cana (PUJ). Everyone books their own flight. The
            transfers from there to the resort and back are included, an hour and
            a half each way.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="scheme-light scheme-paint">
      {/* Built from GROUPS, so the rich result can never say something the
          page does not. */}
      <FaqSchema items={GROUPS.flatMap((group) => group.items)} />
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Before you book</h1>
        <p className="t-lede mt-8 max-w-measure">
          The questions we get most. Anything about money or liability links
          to the part of the Terms that covers it, because that&rsquo;s what
          you&rsquo;re agreeing to.
        </p>
      </header>

      <SectionDivider variant="rule" className="shell" />

      {GROUPS.map((group) => (
        <section key={group.id} id={group.id} className="shell scroll-mt-24 py-14 md:scroll-mt-32 md:py-16">
          <div className="grid gap-10 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] md:gap-20">
            <Reveal>
              <h2 className="t-heading text-[--accent] md:sticky md:top-32">
                {group.heading}
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <ul className="m-0 flex list-none flex-col p-0">
                {group.items.map((item) => (
                  <li key={item.q} className="border-b border-[--rule] last:border-0">
                    {/* Same disclosure pattern the About page uses, so the site
                        has one way of folding text away rather than two. */}
                    <details className="group py-5">
                      <summary
                        className={[
                          "flex cursor-pointer list-none items-start justify-between gap-6",
                          "t-subheading text-[--text] transition-colors duration-fast",
                          "hover:text-[--accent] [&::-webkit-details-marker]:hidden",
                        ].join(" ")}
                      >
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="mt-1 shrink-0 text-[--accent] transition-transform duration-fast group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <div className="mt-4 max-w-measure font-body text-body leading-[1.8] text-[--text-secondary]">
                        {item.a}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      ))}

      <WaitlistCTA
        placement="faq"
        heading="Still deciding?"
        body={
          BOOKINGS_OPEN
            ? "Join the list and you'll hear about the next trip before it goes public."
            : "Join the list and you'll hear when trips open, before they go public."
        }
      />
    </main>
  );
}
