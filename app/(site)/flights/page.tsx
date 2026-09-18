import type { Metadata } from "next";
import Link from "next/link";
import { Reveal, SectionDivider } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { CONTACT } from "@/lib/site-content";
import { getTripLogistics } from "@/lib/trip-logistics";
import { formatDateRange, getPublishedTrips, type PublicTrip } from "@/lib/trips";
import DraftCopy from "../DraftCopy";

/*
 * /flights: how to get to Telluride for the trip.
 *
 * The most-visited link in the booking confirmation email, which hard-codes
 * https://outrider.travel/flights. Do not move this route.
 *
 * What is stated as fact here is either already said elsewhere on the site
 * (Montrose, the distance, transfers from Montrose being included) or general
 * and stable (what TEX and DEN are like in winter). Anything only the team can
 * confirm, such as this season's routes, the arrival cut-off and how the
 * transfer is run, is a DraftCopy placeholder until it is written. The
 * per-departure times come from lib/trip-logistics.ts and replace their
 * placeholders on their own once filled in.
 *
 * Public before launch on purpose: it contains no prices or package detail,
 * only dates, which /trips already shows.
 */

export const metadata: Metadata = pageMetadata({
  title: "Flights to Telluride",
  path: "/flights",
  description:
    "How to fly to an Outrider Telluride trip: which airport, when to land, when to fly home, and what to do if the only connection is a bad one.",
  shareTitle: "Getting to Telluride · Outrider",
});

// Same cadence as /trips, so a new or edited departure appears without a deploy.
export const revalidate = 300;

const LINK = "text-[--accent] underline underline-offset-4";

function isTelluride(trip: PublicTrip): boolean {
  return trip.destination.toLowerCase().includes("telluride");
}

/** "Monday, December 14", read without going through a timezone. */
function longDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function FlightsPage() {
  const trips = (await getPublishedTrips()).filter(isTelluride);

  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">Getting to Telluride</h1>
        <p className="t-lede mt-8 max-w-measure">
          Flights are the one part of the trip you book yourself. Everyone is
          coming from somewhere different, and nobody should pay for a routing
          that suits someone else. This page is what you need to book the right
          one.
        </p>
      </header>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- the short version --------------------------------------------- */}
      <Block heading="The short version">
        <p className="font-body text-lede leading-[1.8] text-[--text]">
          Fly into Montrose (MTJ). Land before the arrival cut-off on the first
          day and fly home after the earliest departure time on the last. Ground
          transport between Montrose and Telluride is arranged and included in
          both directions.
        </p>
        <p className="font-body text-body leading-[1.85] text-[--text-secondary]">
          Once your flights are booked, send us the itinerary at{" "}
          <a href={`mailto:${CONTACT.email}`} className={LINK}>
            {CONTACT.email}
          </a>{" "}
          with your name and the dates of your trip.
        </p>
      </Block>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- when to fly ---------------------------------------------------- */}
      <Block heading="When to land and when to leave">
        <p className="font-body text-body leading-[1.85] text-[--text]">
          Land at Montrose on the first day of the trip and fly home from it on
          the last, inside the times below for your dates.
        </p>

        {trips.length > 0 ? (
          <div className="grid gap-px border border-[--rule] bg-[--rule]">
            {trips.map((trip) => (
              <TripWindow key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <p className="font-body text-body leading-[1.85] text-[--text-secondary]">
            The departures are not on the site at the moment. The times for
            each set of dates will be here when they are.
          </p>
        )}
      </Block>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- airports ------------------------------------------------------- */}
      <Block heading="Which airport">
        <Airport code="MTJ" name="Montrose Regional" verdict="Fly here">
          <p>
            About 65 miles from Telluride, roughly an hour and a half by road.
            It has the most winter service of the airports near Telluride, and
            it is where the included transfer runs from.
          </p>
          {/* Needs: where travelers are met at MTJ, whether pickups run at
              set times or around each arrival, and whether the transfer is
              shared or private by package. Say only what is arranged. */}
          <DraftCopy label="How the Montrose transfer works">
            Where we meet you and how the pickups run. We&rsquo;ll post it here
            and email it to you before the trip.
          </DraftCopy>
          <p>
            In recent winters Montrose has been served mainly through airline
            hubs, so most itineraries connect once. Routes change from season
            to season, so check the airline&rsquo;s own schedule for your dates.
          </p>
          {/* Needs: the airlines and connecting hubs confirmed to serve
              Montrose for the December 2026 and January 2027 dates, from the
              airlines' published schedules. */}
          <DraftCopy label="Airlines and routes into MTJ this season">
            The airlines and connecting hubs flying into Montrose for our
            dates.
          </DraftCopy>
        </Airport>

        <Airport code="TEX" name="Telluride Regional" verdict="Only if it suits you">
          <p>
            A few miles from town, and the closest airport by far. It sits at
            over 9,000 feet, service is limited, and flights are cancelled or
            diverted when weather comes in. If you book it, have a plan for
            landing somewhere else.
          </p>
          {/* Needs: whether Outrider picks up from TEX or the traveler gets
              into town on their own, and what to do if a TEX flight diverts
              to Montrose. */}
          <DraftCopy label="Arrivals into Telluride Regional">
            How you get to the hotel from TEX, and what to do if your flight
            diverts to Montrose. Until it&rsquo;s here, ask us before you book.
          </DraftCopy>
        </Airport>

        <Airport code="DEN" name="Denver International" verdict="Last resort">
          <p>
            Often the cheapest fare, but more than six hours by road in good
            conditions, over mountain passes that close or slow to a crawl in
            winter storms. Only drive it if you have no other way to make the
            dates, and allow a full day.
          </p>
          {/* Needs: whether Outrider can help someone who drives in from
              Denver, and where they should meet the group. */}
          <DraftCopy label="Arriving by road from Denver">
            Where to meet the group if you drive in. Until it&rsquo;s here, ask
            us before you book.
          </DraftCopy>
        </Airport>
      </Block>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- bad connections ------------------------------------------------ */}
      <Block heading="If the only option is a bad connection">
        <ul className="m-0 flex list-none flex-col p-0">
          <Step title="Take the earlier connection">
            Winter delays are common, and missing the last connection into a
            small airport can mean waiting until the next day. If there is a
            choice, take the earlier one, even if it means a long wait at the
            hub.
          </Step>
          <Step title="Stay the night before in Denver">
            If nothing gets you in comfortably before the cut-off, fly to Denver
            the evening before and take a morning flight to Montrose. A night in
            a hotel costs less than missing the first day.
          </Step>
          <Step title="Tell us your itinerary">
            Send the flight numbers and times to{" "}
            <a href={`mailto:${CONTACT.email}`} className={LINK}>
              {CONTACT.email}
            </a>{" "}
            as soon as they are booked, so the transfer is planned around real
            arrivals rather than guesses.
          </Step>
          <Step title="When to write to us">
            Before you book, if no routing gets you in before the cut-off or
            out after the earliest departure. We would rather help you choose
            than find out on the day.
          </Step>
        </ul>
        {/* Needs: who a traveler contacts if a flight is delayed or
            cancelled on the travel day, how (a phone number that is
            answered), and what happens to their transfer. The site has no
            phone number yet. */}
        <DraftCopy label="On the day: delays and cancellations">
          Who to call if your flight is delayed or cancelled on the travel
          day. You&rsquo;ll have the number before you fly.
        </DraftCopy>
        {/* Needs: the date by which Outrider needs each traveler's flight
            itinerary, if there is one. */}
        <DraftCopy label="When to send flight details">
          The date we need your flight details by. Sooner is always better.
        </DraftCopy>
        <p className="font-body text-body leading-[1.85] text-[--text-secondary]">
          Travel insurance isn&rsquo;t included. If you add it, a policy that
          covers missed connections and weather delays is worth the most on a
          winter trip.
          Anything else is in the{" "}
          <Link href="/faq" className={LINK}>
            FAQ
          </Link>
          , or see{" "}
          <Link href="/telluride" className={LINK}>
            the Telluride departures
          </Link>
          .
        </p>
      </Block>
    </main>
  );
}

/* -- pieces ----------------------------------------------------------------- */

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="shell py-14 md:py-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] md:gap-20">
        <Reveal>
          <h2 className="t-heading text-[--accent] md:sticky md:top-32">{heading}</h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="flex max-w-measure flex-col gap-7">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}

/** One departure's arrival and departure window. */
function TripWindow({ trip }: { trip: PublicTrip }) {
  const { arrivalDeadline, departureEarliest } = getTripLogistics(trip.startDate);

  return (
    <div className="flex flex-col gap-5 bg-[--surface-raised] p-6 md:p-8">
      <h3 className="t-subheading text-[--text]">{formatDateRange(trip.startDate, trip.endDate)}</h3>
      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="stamp-type text-[--text-muted]">Land at Montrose by</dt>
          <dd className="mt-2 font-body text-body text-[--text]">
            {arrivalDeadline ?? (
              // Set arrivalDeadline in lib/trip-logistics.ts.
              <DraftCopy label="Arrival time">
                The latest time to land at Montrose on {longDay(trip.startDate)}.
              </DraftCopy>
            )}
          </dd>
        </div>
        <div>
          <dt className="stamp-type text-[--text-muted]">Fly home no earlier than</dt>
          <dd className="mt-2 font-body text-body text-[--text]">
            {departureEarliest ?? (
              // Set departureEarliest in lib/trip-logistics.ts.
              <DraftCopy label="Departure time">
                The earliest flight home from Montrose on {longDay(trip.endDate)}.
              </DraftCopy>
            )}
          </dd>
        </div>
      </dl>
      {/* Whatever the team has written in the trip's logistics field in the
          admin. It is the same text the confirmation email carries, so the two
          cannot disagree. */}
      {trip.logistics && (
        <div className="border-l-2 border-[--accent] pl-5">
          <p className="t-micro text-[--text-secondary]">From the trip notes</p>
          <p className="mt-3 whitespace-pre-wrap font-body text-body-s leading-[1.75] text-[--text-secondary]">
            {trip.logistics}
          </p>
        </div>
      )}
    </div>
  );
}

function Airport({
  code,
  name,
  verdict,
  children,
}: {
  code: string;
  name: string;
  verdict: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[--rule] pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="t-subheading text-[--text]">
          {name} <span className="text-[--text-muted]">({code})</span>
        </h3>
        <span className="t-micro text-[--accent]">{verdict}</span>
      </div>
      <div className="flex flex-col gap-4 font-body text-body leading-[1.85] text-[--text-secondary]">
        {children}
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="border-b border-[--rule] py-5 first:pt-0 last:border-0">
      <h3 className="t-subheading text-[--text]">{title}</h3>
      <p className="mt-3 font-body text-body leading-[1.85] text-[--text-secondary]">{children}</p>
    </li>
  );
}
