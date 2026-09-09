import type { Metadata } from "next";
import Link from "next/link";
import { Reveal, SectionDivider, WaitlistCTA } from "@/components/ui";
import { CONTACT } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How an Outrider trip works: what the price covers, how deposits and installments run, what happens if you cancel, group size, flights, and who is on the ground.",
};

/* Answers deliberately do not restate deposit percentages, installment counts
 * or refund windows. Those live in the Terms and are computed from the booking
 * data, and an FAQ that quotes a number the contract later changes is worse
 * than one that points at the contract. Anything with money or liability in it
 * links to the clause instead. */
type QA = { q: string; a: React.ReactNode };
type Group = { heading: string; items: QA[] };

const GROUPS: Group[] = [
  {
    heading: "Booking and paying",
    items: [
      {
        q: "What is actually included in the price?",
        a: (
          <>
            Lodging, the activities listed on the trip, ground transport at the
            destination, any private events, and Outrider staff on the ground
            for the whole trip. The number on the trip page is what the trip
            costs. There is no resort fee at check in and no separate charge for
            the shuttle. Flights are the exception and are booked separately.
          </>
        ),
      },
      {
        q: "How does paying work?",
        a: (
          <>
            A deposit holds your spot and the balance is split into scheduled
            installments charged automatically to the card you booked with. Each
            traveler books and pays for their own spot, so nobody fronts money
            for friends and nobody spends the spring chasing a group chat. The
            exact deposit and the installment dates are set out in{" "}
            <Link href="/terms#payment-plan" className="text-[--accent] underline underline-offset-4">
              the payment plan section of the Terms
            </Link>
            .
          </>
        ),
      },
      {
        q: "What happens if a payment fails?",
        a: (
          <>
            We retry it, and you get an email with a link to fix the card or
            complete a bank authentication step if your bank asks for one. A
            failed payment does not immediately cost you the spot. The retry
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
            . The short version is that the deposit is what holds a room we have
            already committed to, so it does not come back, and the rest is on a
            sliding scale that closes as the departure gets near. Travel
            insurance is worth buying.
          </>
        ),
      },
    ],
  },
  {
    heading: "The trip itself",
    items: [
      {
        q: "How many people are on a trip?",
        a: (
          <>
            Capped before it goes on sale rather than grown until it stops
            selling. Rooms are booked as buyouts for six or eight, and where
            there is guiding it is one instructor per six. You will know
            everyone by the second day, which is the entire point.
          </>
        ),
      },
      {
        q: "Do I need to know how to ski?",
        a: (
          <>
            No. Telluride has enough gentle terrain that a first timer is not
            written off on day one, and lessons can be arranged. Tell us when
            you book so the right thing is set up before you land rather than
            negotiated at the ticket window on the first morning.
          </>
        ),
      },
      {
        q: "Is somebody from Outrider actually there?",
        a: (
          <>
            Yes, for the duration, not at the end of an email. That is the part
            that makes the difference when a room is wrong or a plan needs to
            change, and it is why the person who organized the trip gets to
            actually ski.
          </>
        ),
      },
      {
        q: "Is this a party trip?",
        a: (
          <>
            No. College is fun and there will be plenty of that. But the thing
            we are selling is the place: somewhere worth the flight, a group
            small enough to know, and a few days you are still talking about in
            ten years. If you want the cheapest hotel filled with as many people
            as possible, that already exists and it is not us.
          </>
        ),
      },
    ],
  },
  {
    heading: "Getting there",
    items: [
      {
        q: "Are flights included?",
        a: (
          <>
            No, and that is deliberate. Everyone is coming from somewhere
            different, and bundling a flight means somebody pays for a routing
            that suits someone else. You book your own and we tell you exactly
            which airport and which arrival window to aim for.
          </>
        ),
      },
      {
        q: "Which airport?",
        a: (
          <>
            For Telluride, fly into Montrose. It is about 65 miles out, roughly
            an hour and a half of driving, and ground transport in both
            directions is arranged and included.
          </>
        ),
      },
    ],
  },
  {
    heading: "Groups and everything else",
    items: [
      {
        q: "Can I book with my friends?",
        a: (
          <>
            Yes. Everyone books their own spot, and a group code keeps you
            together for rooming. The difference from the usual arrangement is
            that no single person is holding everyone else's money.
          </>
        ),
      },
      {
        q: "When do trips go on sale?",
        a: BOOKINGS_OPEN ? (
          <>
            Departures are open now. Dates, packages and pricing are on the{" "}
            <Link href="/trips" className="text-[--accent] underline underline-offset-4">
              trips page
            </Link>
            .
          </>
        ) : (
          <>
            Shortly. The dates, the packages and the pricing are final and are
            already on the{" "}
            <Link href="/trips" className="text-[--accent] underline underline-offset-4">
              trips page
            </Link>
            . Join the list below and you will hear before it goes public.
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
];

export default function FaqPage() {
  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Questions</h1>
        <p className="t-lede mt-8 max-w-measure">
          The things people ask before they put money down. Anything that turns
          on money or liability links to the clause that governs it rather than
          paraphrasing it, because the Terms are what you are agreeing to.
        </p>
      </header>

      <SectionDivider variant="rule" className="shell" />

      {GROUPS.map((group) => (
        <section key={group.heading} className="shell py-14 md:py-16">
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
        heading="Still deciding?"
        body="Join the list and you will hear when departures open, before they go public."
      />
    </main>
  );
}
