import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { FaqSchema, Reveal, SectionDivider, WaitlistCTA } from "@/components/ui";
import { CONTACT } from "@/lib/site-content";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { PAY_IN_FULL_DISCOUNT } from "@/lib/deposit";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  path: "/faq",
  description:
    "How an Outrider college group trip works: what the price covers, deposits and installments, cancelling, group size, flights, and who's with you on the trip.",
  shareTitle: "Questions about Outrider trips · Outrider",
});

/* Answers deliberately do not restate deposit percentages, installment counts,
 * the pay-in-full discount or refund windows. Those live in the Terms and are
 * computed from the booking data, and an FAQ that quotes a number the contract later changes is worse
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
            Your lodging, the activities listed on the trip, ground transport at
            the destination, any private events, and our team with you for the
            whole trip. The number on the trip page is what the trip costs:
            no resort fee at check-in and no separate charge for the shuttle.
            Flights are the one exception, and you book those yourself.
          </>
        ),
      },
      {
        q: "How does paying work?",
        a: (
          <>
            A deposit holds your spot, and the balance is split into scheduled
            installments charged automatically to the card you booked with. You
            can pay toward the balance early from your bookings page any time,
            which brings the next installment down. Or pay for the whole trip
            when you book,{" "}
            {PAY_IN_FULL_DISCOUNT > 0 && "which costs a little less and "}means
            nothing is charged later. Everyone books and pays for their own
            spot, so nobody fronts money for friends or spends the spring
            chasing a group chat. The exact deposit and paying in full
            are set out in{" "}
            <Link href="/terms#booking-and-deposit" className="text-[--accent] underline underline-offset-4">
              the booking section of the Terms
            </Link>
            , and the installment dates and paying ahead in{" "}
            <Link href="/terms#payment-plan" className="text-[--accent] underline underline-offset-4">
              the payment plan section
            </Link>
            .
          </>
        ),
      },
      {
        q: "What happens if a payment fails?",
        a: (
          <>
            We try it again and email you a link to update your card, or to
            finish a bank authentication step if your bank asks for one. A
            failed payment doesn&rsquo;t immediately cost you your spot. The retry
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
            About 100 to 200. It feels more like a small club than a tour. The
            number is set before a trip goes on sale and doesn&rsquo;t move to
            fit demand. Rooms are shared by four or by two, and a private penthouse
            holds eight, so the group you actually live with all week stays
            small.
          </>
        ),
      },
      {
        q: "Do I need to know how to ski?",
        a: (
          <>
            Not at all. Telluride has plenty of gentle terrain for a first
            timer, and lessons can be arranged. Tell us when you book and
            we&rsquo;ll have it set up before you land, so your first morning
            starts on the snow instead of at the ticket window.
          </>
        ),
      },
      {
        q: "Is somebody from Outrider actually there?",
        a: (
          <>
            Yes, for the whole trip. If a room needs fixing or a plan changes,
            someone from our team is right there to sort it out. It also means
            the friend who organized the trip gets to ski too.
          </>
        ),
      },
      {
        q: "Is this a party trip?",
        a: (
          <>
            We build every trip around the place and the experience: a great
            property in a town worth exploring, with every detail taken care
            of. College is fun, and there will be plenty of that.
            What we care about is that every day is worth the flight and
            you&rsquo;re still talking about it in ten years.
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
            No, on purpose. Everyone is flying in from somewhere different, and
            bundling flights would mean somebody paying for a routing that suits
            someone else. You book your own, and we tell you exactly which
            airport and which arrival window to aim for.
          </>
        ),
      },
      {
        q: "Which airport?",
        a: (
          <>
            For Telluride, fly into Montrose. It&rsquo;s about 65 miles out, roughly
            an hour and a half of driving, and ground transport in both
            directions is arranged and included. The{" "}
            <Link href="/flights" className="text-[--accent] underline underline-offset-4">
              flight guide
            </Link>{" "}
            has the arrival and departure times and what to do about a bad
            connection.
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
            together for rooming. That way no one person ends up holding
            everyone else&rsquo;s money.
          </>
        ),
      },
      {
        q: "When do trips go on sale?",
        a: BOOKINGS_OPEN ? (
          <>
            They&rsquo;re open now. Dates, packages and pricing are on the{" "}
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
            . Join the list below and you&rsquo;ll hear before it goes public.
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
      {/* Built from GROUPS, so the rich result can never say something the
          page does not. */}
      <FaqSchema items={GROUPS.flatMap((group) => group.items)} />
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Questions</h1>
        <p className="t-lede mt-8 max-w-measure">
          Everything people ask before they book. Anything about money or
          liability links straight to the part of the Terms that covers it,
          since the Terms are what you&rsquo;re agreeing to.
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
        placement="faq"
        heading="Still deciding?"
        body="Join the list and you'll hear when trips open, before they go public."
      />
    </main>
  );
}
