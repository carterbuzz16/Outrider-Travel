// Outrider — "How it usually goes / With Outrider" comparison block.
// components/ui/ComparisonTable.tsx — rendered on the About page.
//
// Desktop: three columns, long copy, the Outrider column as a solid teal panel.
// Mobile (<=760px): stacked rows, short copy, teal panel per row.
// Both copy sets live in the markup; CSS shows the right one. Real text, so it
// stays readable to screen readers and search engines.
//
// Fonts: DM Mono (500) and Source Serif 4 (400), free on Google Fonts. If they
// are not loaded site-wide, add them in app/layout.tsx via next/font/google.

type Row = {
  label: string;
  usualLong: string;
  usualShort: string;
  outriderLong: string;
  outriderShort: string;
};

const ROWS: Row[] = [
  {    label: "The price",
    usualLong:
      "A headline number, then lift tickets, rentals, transfers and resort fees on top. Nobody knows the real total until it is spent.",
    usualShort: "Base price, then tickets, rentals, transfers and fees on top",
    outriderLong:
      "One price per person with everything in it. What you see on the trip page is what the trip costs.",
    outriderShort: "One price. Everything in it.",
  },
  {    label: "Where you stay",
    usualLong:
      "Twenty people spread across four rentals on the wrong side of town, sorted by whoever booked first.",
    usualShort: "Twenty people across four rentals",
    outriderLong:
      "One property, booked whole. Everyone is under the same roof, walking distance from the same lift.",
    outriderShort: "One property, booked whole",
  },
  {    label: "Lift tickets and gear",
    usualLong:
      "Bought individually, at the window, on the first morning, in the line.",
    usualShort: "Bought at the window on day one",
    outriderLong:
      "Three-day tickets and rentals arranged before you land, with a valet fitting slot on the upper tiers.",
    outriderShort: "Arranged before you land",
  },
  {    label: "Getting there",
    usualLong:
      "Everyone books their own ride from the airport and hopes the timing works.",
    usualShort: "Sort your own ride from the airport",
    outriderLong:
      "Ground transport both directions is arranged and included, shared or private depending on your package.",
    outriderShort: "Transport both directions, included",
  },
  {    label: "Paying for it",
    usualLong:
      "One person fronts the money and spends the next three months chasing a group chat.",
    usualShort: "One person fronts it and chases the group chat",
    outriderLong:
      "Each traveler books their own spot. A deposit holds it, the balance is split into scheduled payments, and nobody owes a friend anything.",
    outriderShort: "Everyone books their own spot, on a payment plan",
  },
  {    label: "On the trip",
    usualLong:
      "Whoever organized it becomes the help desk for four days and never really gets a holiday.",
    usualShort: "The organizer becomes the help desk",
    outriderLong:
      "Outrider staff are on the ground for the duration. The person who organized it gets to actually ski.",
    outriderShort: "Outrider staff on the ground",
  },
  {    label: "How many people",
    usualLong: "As many as will pay, because volume is the business model.",
    usualShort: "As many as will pay",
    outriderLong:
      "The cap is set before a single spot goes on sale, and it does not move to fit demand. Suites hold four, six or eight and guiding is one instructor per six. Exclusive because it is small, not because it is expensive.",
    outriderShort: "Capped before it sells. Small by design.",
  },
];

export default function ComparisonTable() {
  return (
    <section className="ocmp" aria-labelledby="ocmp-heading">
      <style>{css}</style>

      <header className="ocmp-top">
        <div>
          <p className="ocmp-eyebrow">Outrider</p>
          <h2 className="ocmp-heading" id="ocmp-heading">
            A group trip, two ways
          </h2>
        </div>
        <p className="ocmp-standfirst">
          The same seven decisions, handled the usual way and handled by us.
        </p>
      </header>

      <div className="ocmp-grid">
        <div className="ocmp-colhead ocmp-colhead--spacer" aria-hidden="true" />
        <div className="ocmp-colhead ocmp-colhead--usual" aria-hidden="true">
          How it usually goes
        </div>
        <div className="ocmp-colhead ocmp-colhead--outrider" aria-hidden="true">
          With Outrider
        </div>

        {ROWS.map((row) => (
          <div className="ocmp-row" key={row.label}>
            <h3 className="ocmp-label">
              {row.label}
            </h3>

            <p className="ocmp-cell ocmp-cell--usual">
              <span className="ocmp-tag">Usually</span>
              <span className="ocmp-long">{row.usualLong}</span>
              <span className="ocmp-short">{row.usualShort}</span>
            </p>

            <p className="ocmp-cell ocmp-cell--outrider">
              <span className="ocmp-tag ocmp-tag--outrider">Outrider</span>
              <span className="ocmp-long">{row.outriderLong}</span>
              <span className="ocmp-short">{row.outriderShort}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const css = `
.ocmp {
  /* Bound to the site tokens (app/globals.css) rather than restated, so this
     block cannot drift out of step with the rest of the pages. The literals
     are fallbacks only. */
  --paper: var(--surface, #FAF6EF);
  --charcoal: var(--text, #1A1A1A);
  --ash: var(--text-secondary, #6B6B6B);
  --teal: var(--accent, #37646E);
  --ocmp-rule: var(--rule, rgba(26, 26, 26, 0.16));
  --rule-inverse: rgba(241, 233, 220, 0.22);
  background: var(--paper);
  color: var(--charcoal);
  padding: 0;
}
.ocmp *, .ocmp *::before, .ocmp *::after { box-sizing: border-box; }
.ocmp p, .ocmp h2, .ocmp h3 { margin: 0; }
.ocmp .ocmp-short { display: none; }

.ocmp-top {
  display: block;
  margin-bottom: 48px;
}
.ocmp-eyebrow {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 14px;
}
.ocmp-heading {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(34px, 4.4vw, 52px);
  line-height: 1.08;
  letter-spacing: -0.015em;
  text-wrap: balance;
}
.ocmp .ocmp-standfirst {
  font-family: var(--font-body);
  font-size: 18px;
  line-height: 1.65;
  color: var(--charcoal);
  max-width: 52ch;
  margin-top: 18px;
}

/* Desktop: label / usual / teal panel. Rows are subgrids so the teal column
   reads as one continuous block down the table. */
.ocmp-grid { display: grid; grid-template-columns: 1fr; }
.ocmp-row {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
}
@supports not (grid-template-columns: subgrid) {
  .ocmp-row { grid-template-columns: 220px 1fr 1fr; }
}
.ocmp-grid { grid-template-columns: 220px 1fr 1fr; }

.ocmp-colhead {
  align-self: end;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ocmp-colhead--usual {
  color: var(--charcoal);
  padding: 0 32px 14px 0;
  border-bottom: 1px solid var(--ocmp-rule);
}
.ocmp-colhead--outrider {
  color: var(--paper);
  background: var(--teal);
  padding: 16px 32px 14px;
}

.ocmp-label {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 26px 32px 26px 0;
  border-bottom: 1px solid var(--ocmp-rule);
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 0.12em;
  line-height: 1.45;
  text-transform: uppercase;
  color: var(--charcoal);
}

.ocmp-cell {
  font-family: var(--font-body);
  font-size: 19px;
  line-height: 1.65;
}
.ocmp-cell--usual {
  color: var(--charcoal);
  padding: 26px 32px 26px 0;
  border-bottom: 1px solid var(--ocmp-rule);
}
.ocmp-cell--outrider {
  color: var(--paper);
  background: var(--teal);
  padding: 26px 32px;
  border-bottom: 1px solid var(--rule-inverse);
}
.ocmp-row:last-child .ocmp-cell--outrider { border-bottom: 0; padding-bottom: 32px; }
.ocmp-tag { display: none; }

@media (max-width: 760px) {
  .ocmp { padding: 32px 0 36px; }
  .ocmp .ocmp-long { display: none; }
  .ocmp .ocmp-short { display: block; }

  .ocmp-top { display: block; margin-bottom: 26px; }
  .ocmp-standfirst { margin-top: 16px; font-size: 17px; }

  .ocmp-grid { display: flex; flex-direction: column; gap: 22px; }
  .ocmp-colhead { display: none; }
  .ocmp-row { display: block; }

  .ocmp-label { padding: 0 0 10px; font-size: 14px; }
  .ocmp-cell { font-size: 18px; line-height: 1.55; }
  .ocmp-cell--usual { padding: 14px 0 16px; border-bottom: 0; }
  .ocmp-cell--outrider { padding: 16px 18px; border-bottom: 0; }
  .ocmp-row:last-child .ocmp-cell--outrider { padding-bottom: 16px; }

  .ocmp-tag {
    display: block;
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ash);
  }
    /* 0.75 measured 4.22:1 at 11px against the teal panel, under the 4.5:1 AA
     floor for small text. Full cream clears it. */
  .ocmp-tag--outrider { color: var(--paper); }
}
`;
