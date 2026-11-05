import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { CAMPUSES, CAMPUSES_LABEL, CAMPUSES_PAGE, MORE_CAMPUSES } from "@/lib/site-content";

const TOTAL = CAMPUSES.length + MORE_CAMPUSES.length;

export const metadata: Metadata = pageMetadata({
  title: "Campuses",
  path: "/campuses",
  description: `Outrider is on campus at ${TOTAL} schools. Every school with an Outrider ambassador right now.`,
});

/*
 * /campuses: every school where we have an ambassador (Carter, 3 November 2026: the
 * strip on Home and /partners "goes to a simple page showing all the schools"). What
 * the page may claim is in the note on CAMPUSES (lib/site-content.ts): names only,
 * and "ambassador", since no trip has run yet.
 *
 * A wall of type on espresso and nothing else. The strip's 25 come first in the same
 * capitals and order, so someone arriving from it sees what they tapped, and the rest
 * follow smaller, A to Z. The label and the number read as one line: "On campus at 43
 * schools". The count comes from the lists, so it can never disagree with them.
 */

/**
 * A paragraph of names that happens to be a list, so it wraps like running type.
 * Each is an inline-block so "South Carolina" moves to the next line whole, and only
 * a name wider than a phone's line ("University of Washington") breaks at all.
 */
function SchoolList({ names, className }: { names: string[]; className: string }) {
  return (
    <ul className={`m-0 list-none p-0 text-[--text] ${className}`}>
      {names.map((school, i) => (
        <li key={school} className="mr-[0.28em] inline-block">
          {school}
          {i < names.length - 1 && (
            // A non-breaking space, so a slash never starts a line.
            <span aria-hidden="true" className="font-medium text-[--accent]">
              {" /"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CampusesPage() {
  return (
    <main className="scheme-espresso scheme-paint">
      <header className="shell pb-10 pt-32 md:pb-14 md:pt-40">
        <p className="t-label m-0 text-[--text-secondary]">{CAMPUSES_LABEL}</p>
        <h1 className="t-display m-0 mt-5 text-[--text]">{TOTAL} schools</h1>
        <p className="t-lede m-0 mt-6 max-w-measure text-[--text-secondary]">{CAMPUSES_PAGE.line}</p>
      </header>

      <section className="shell pb-20 md:pb-28" aria-label="Schools with an Outrider ambassador">
        <SchoolList
          names={CAMPUSES}
          className="font-display text-[length:clamp(2rem,4.6vw,4.25rem)] font-extrabold uppercase leading-[1.14] tracking-display"
        />
        <SchoolList
          names={MORE_CAMPUSES}
          className="mt-10 font-display text-[length:clamp(1.25rem,2.2vw,2rem)] font-medium leading-[1.4] md:mt-14"
        />
      </section>

      {/* Club blue's one panel on this page, handing into the espresso footer. */}
      <section className="scheme-club scheme-paint" aria-labelledby="campuses-close">
        <div className="shell flex flex-col gap-6 py-16 md:flex-row md:items-end md:justify-between md:gap-16 md:py-20">
          <div>
            <h2 id="campuses-close" className="t-title m-0 text-[--text]">
              {CAMPUSES_PAGE.closeTitle}
            </h2>
            <p className="t-lede m-0 mt-3 text-[--text]">{CAMPUSES_PAGE.closeLine}</p>
          </div>
          <Button href="/ambassador" variant="primary" size="lg">
            {CAMPUSES_PAGE.closeCta}
          </Button>
        </div>
      </section>
    </main>
  );
}
