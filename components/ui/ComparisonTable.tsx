// Outrider — "The usual trip / With Outrider" comparison.
// components/ui/ComparisonTable.tsx — rendered on the About page.
//
// Rebuilt 1 October 2026, when Carter found the About page hard to read and
// said its main job is to show why Outrider is better than the usual college
// trip. The old version was a three-column table of small type with hairlines
// between rows. Now each row is a block: the label, the usual way in muted
// type, and Outrider's answer in a Ski Club blue panel, its short line large
// and its detail under it. One layout at every width (side by side from md,
// stacked on a phone), so there is no second copy of the text to keep in step.
// No rules: space and the blue panels carry the structure (see .site-quiet).
//
// The parent supplies the section, its heading and its scheme (espresso).
type Row = {
  label: string;
  usualLong: string;
  usualShort: string;
  outriderLong: string;
  outriderShort: string;
};

// Rewritten 1 October 2026: Carter, "we're comparing ourselves to other tour
// operators", the big college trip companies, not friends planning their own
// trip. The left column says what those trips usually are; the right only
// what the site already promises (TRIP_WHAT_YOU_GET, the tier inclusions in
// the database, the FAQ). Performance rentals are on Two to a Room and the
// penthouses, not every package, so the gear row says so. Voice (Carter, the
// same day): keep it fun, it's college, but say plainly why we're different,
// why you'd come, and what you get.
const ROWS: Row[] = [
  {
    label: "The price",
    usualLong: "A cheap number up front, then lift tickets, rentals, shuttles and resort fees piled on top.",
    usualShort: "Cheap up front, then fees",
    outriderLong: "Your room, lifts, rentals, rides and the parties. The only thing you book yourself is your flight.",
    outriderShort: "One price. Everything in it.",
  },
  {
    label: "Where you stay",
    usualLong: "Whatever is cheapest, usually a budget hotel or condos scattered around town.",
    usualShort: "Whatever is cheapest",
    outriderLong: "Everyone under one roof at The Peaks, ski-in, ski-out, with its own spa. Walk out the door, click in, go.",
    outriderShort: "A great hotel, ski-in, ski-out",
  },
  {
    label: "Lift tickets and gear",
    usualLong: "Sold separately, plus a rental line on the first morning.",
    usualShort: "Extra, plus a rental line",
    outriderLong: "In every package and fitted before you land. Two to a Room and the penthouses get performance rentals.",
    outriderShort: "Already sorted",
  },
  {
    label: "Getting there",
    usualLong: "Figure out your own ride from the airport.",
    usualShort: "Find your own ride",
    outriderLong: "Pickup at Montrose and the ride back are booked before you land, just for your group. Penthouses get a private SUV.",
    outriderShort: "Your ride is waiting",
  },
  {
    label: "Paying for it",
    usualLong: "One friend fronts it and spends the semester chasing Venmo requests.",
    usualShort: "One friend fronts it",
    outriderLong: "Put down 10%, then two installments, or pay in full and take $100 off. Nobody owes anybody.",
    outriderShort: "Everyone pays their own way",
  },
  {
    label: "On the trip",
    usualLong: "Nobody from the company there. Something goes wrong? Good luck.",
    usualShort: "Nobody there to help",
    outriderLong: "Our team is with you from pickup to drop-off, for anything you need.",
    outriderShort: "We've got you all week",
  },
  {
    label: "How many people",
    usualLong: "As many as will pay, often hundreds.",
    usualShort: "As many as will pay",
    outriderLong: "Capped before a single spot sells, with rooms for four or two and penthouses for eight. It feels like a private club.",
    outriderShort: "Small and exclusive",
  },
];

export default function ComparisonTable() {
  return (
    <div>
      {/* Column heads, from md, where the two columns sit side by side. */}
      <div aria-hidden="true" className="hidden md:grid md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.25fr)] md:gap-x-8 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-x-12">
        <span />
        <span className="t-label text-[--text-secondary]">Other trip companies</span>
        <span className="t-label text-[--text]">With Outrider</span>
      </div>

      <ul className="m-0 mt-6 flex list-none flex-col gap-4 p-0 md:mt-5 md:gap-5">
        {ROWS.map((row) => (
          <li
            key={row.label}
            className="grid gap-x-8 gap-y-3 md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.25fr)] md:items-center lg:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-x-12"
          >
            <h3 className="m-0 pt-4 font-display text-body font-medium text-[--text] md:pt-0">{row.label}</h3>

            <p className="m-0 font-body text-body leading-[1.55] text-[--text-secondary]">
              <span className="t-micro mb-1 block text-[--text-secondary] md:hidden">Other trip companies</span>
              {row.usualLong}
            </p>

            <div className="scheme-club scheme-paint px-5 py-5 md:px-7 md:py-6">
              <span className="t-micro mb-1.5 block text-[--text-secondary] md:hidden">With Outrider</span>
              <p className="m-0 font-display text-lede font-extrabold leading-snug tracking-title text-[--text]">
                {row.outriderShort}
              </p>
              <p className="m-0 mt-2 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                {row.outriderLong}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
