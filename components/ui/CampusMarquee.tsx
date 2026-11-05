import Link from "next/link";
import { CAMPUSES, CAMPUSES_LABEL, MORE_CAMPUSES } from "@/lib/site-content";
import { cn } from "./cn";
import CampusMarqueeScrub from "./CampusMarqueeScrub";

/**
 * The schools, rolling (Carter, 3 November 2026: "a rolling thing on the page"
 * to build trust).
 *
 * Names in our own type and nothing else. No logos, seals, mascots or school
 * colors: those are trademarks a school licenses, and using them would read as
 * the school endorsing us. See the note on CAMPUSES for what the label can claim.
 *
 * In the book's Extrabold capitals and big, because a short list of strong names
 * is the whole point of it, and the edges fade so a name eases in and out instead
 * of being cut off at the side of the screen. Drag, swipe or tap it: see
 * CampusMarqueeScrub. The link beside the label goes to the same full list.
 *
 * The set is rendered twice so the CSS loop has no seam (.marquee-track in
 * globals.css), with the second copy hidden from assistive tech. It pauses on
 * hover, and under reduced motion it stops and scrolls by hand. The `/` is the
 * brand's repeating device, as on the coming-soon marquee.
 */
export default function CampusMarquee({ className }: { className?: string }) {
  return (
    <section className={cn("py-14 md:py-20", className)} aria-labelledby="campuses-label">
      <div className="shell flex items-baseline justify-between gap-6">
        <p id="campuses-label" className="t-label m-0 text-[--text-secondary]">
          {CAMPUSES_LABEL}
        </p>
        <Link href="/campuses" className="t-label shrink-0 text-[--text] underline underline-offset-4">
          See all {CAMPUSES.length + MORE_CAMPUSES.length} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <CampusMarqueeScrub
        href="/campuses"
        className="marquee mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] md:mt-8"
      >
        {/* The same pace at every size, about 110 pixels a second: the type is smaller
            on a phone, so the loop is shorter and takes less time. */}
        <ul className="marquee-track m-0 list-none p-0 [animation-duration:70s] md:[animation-duration:120s]">
          {[0, 1].map((copy) =>
            CAMPUSES.map((school) => (
              <li
                key={`${copy}-${school}`}
                aria-hidden={copy === 1 || undefined}
                className="flex shrink-0 items-baseline whitespace-nowrap font-display text-[length:clamp(2.75rem,6.4vw,6rem)] font-extrabold uppercase leading-none tracking-display text-[--text]"
              >
                {school}
                <span aria-hidden="true" className="px-[0.4em] font-medium text-[--accent]">
                  /
                </span>
              </li>
            )),
          )}
        </ul>
      </CampusMarqueeScrub>
    </section>
  );
}
