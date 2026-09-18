// Outrider — "How it usually goes / With Outrider" comparison block.
// components/ui/ComparisonTable.tsx — rendered on the About page.
//
// Desktop: three columns, long copy, the Outrider column as a solid espresso panel.
// Mobile (<=760px): stacked rows, short copy, espresso panel per row.
// Both copy sets live in the markup; CSS shows the right one. Real text, so it
// stays readable to screen readers and search engines.
//
// Fonts: the brand family through --font-display / --font-body, loaded
// site-wide in app/layout.tsx.

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
      "A low number up front, then lift tickets, rentals, transfers and resort fees on top.",
    usualShort: "Base price, then tickets, rentals and fees on top",
    outriderLong:
      "One price per person with everything in it. The number on the trip page is the whole trip.",
    outriderShort: "One price. Everything in it.",
  },
  {    label: "Where you stay",
    usualLong:
      "Your group split across rentals around town, sorted by whoever booked first.",
    usualShort: "Split across rentals around town",
    outriderLong:
      "One property for the whole group. Everyone under the same roof, walking distance from the same lift.",
    outriderShort: "Everyone under one roof",
  },
  {    label: "Lift tickets and gear",
    usualLong:
      "Bought one at a time at the window, on the first morning, in line.",
    usualShort: "Bought at the window on day one",
    outriderLong:
      "Three-day lift tickets and rentals ready before you land, with performance rentals on the upper tiers.",
    outriderShort: "Ready before you land",
  },
  {    label: "Getting there",
    usualLong:
      "Everyone sorts out their own ride from the airport.",
    usualShort: "Sort your own ride from the airport",
    outriderLong:
      "Ground transport both directions is arranged and included, shared or private depending on your package.",
    outriderShort: "Rides both ways, included",
  },
  {    label: "Paying for it",
    usualLong:
      "One friend fronts the money and spends months chasing the group chat.",
    usualShort: "One friend fronts it and chases the group chat",
    outriderLong:
      "Everyone books their own spot. A deposit holds it, the rest is split into scheduled payments, and nobody owes a friend a thing.",
    outriderShort: "Everyone books their own spot, on a payment plan",
  },
  {    label: "On the trip",
    usualLong:
      "Whoever planned it spends the week as the help desk.",
    usualShort: "The planner becomes the help desk",
    outriderLong:
      "Our team is with you the whole trip, so the friend who planned it finally gets to ski.",
    outriderShort: "Our team with you all week",
  },
  {    label: "How many people",
    usualLong: "As many as will pay.",
    usualShort: "As many as will pay",
    outriderLong:
      "Set before a single spot goes on sale, and it stays there. Rooms hold four or two, a private penthouse holds eight, and there's one instructor for every six. Small enough that it still feels like your trip.",
    outriderShort: "Capped before it sells",
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
            What sets us apart
          </h2>
        </div>
        <p className="ocmp-standfirst">
          Seven things we take care of for you, next to how a group trip
          usually goes.
        </p>
      </header>

      <div className="ocmp-grid">
        <div className="ocmp-colhead ocmp-colhead--spacer" aria-hidden="true" />
        <div className="ocmp-colhead ocmp-colhead--usual" aria-hidden="true">
          The usual way
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
  --paper: var(--surface, #F2EFEA);
  --charcoal: var(--text, #3E342F);
  --ash: var(--text-secondary, #6B635C);
  --teal: var(--accent, #56643F);
  --ocmp-rule: var(--rule, rgba(62, 52, 47, 0.18));
  /* The Outrider column: espresso, the brand's own dark ground. Paper on it
     is 10.5:1, so the long copy reads at full size. */
  --ocmp-panel: var(--color-espresso, #3E342F);
  --rule-inverse: rgba(242, 239, 234, 0.22);
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
  background: var(--ocmp-panel);
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
  background: var(--ocmp-panel);
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
    /* 0.75 measured 4.22:1 at 11px against the panel, under the 4.5:1 AA
     floor for small text. Full cream clears it. */
  .ocmp-tag--outrider { color: var(--paper); }
}
`;
