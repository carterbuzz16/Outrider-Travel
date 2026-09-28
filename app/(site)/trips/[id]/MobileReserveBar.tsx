"use client";

import { useEffect, useState } from "react";
import { Button, cn } from "@/components/ui";

/**
 * A slim "Reserve" bar along the bottom of a phone screen, on a departure
 * page while it can be booked.
 *
 * Once booking opened, MobileJoinBar stepped aside and a phone had no ask
 * within thumb reach: the nav's is folded into the menu, and the page's own
 * Reserve buttons sit in the packages, a long scroll down past everything
 * people read first. This keeps one there without getting in the way, on the
 * same terms as MobileJoinBar:
 *
 *   - it appears only once the masthead has been scrolled past;
 *   - it steps aside wherever the page already offers Reserve (anything
 *     marked data-reserve-bar-hide: the packages, the closing band) and when
 *     the footer is on screen, so there are never two asks at once;
 *   - it can be dismissed for the rest of the visit;
 *   - it never shows from md up.
 *
 * No price on it: the owner wants people to see what they get before what it
 * costs, and the masthead has already said "from".
 */
export default function MobileReserveBar({ href, place, dates }: { href: string; place: string; dates: string }) {
  const [pastHero, setPastHero] = useState(false);
  const [covered, setCovered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = [...document.querySelectorAll("[data-reserve-bar-hide], footer")];
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setCovered(onScreen.size > 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  if (dismissed) return null;
  const visible = pastHero && !covered;

  return (
    <div
      className={cn(
        "scheme-espresso fixed inset-x-0 bottom-0 z-30 border-t border-[--rule] bg-[--surface] text-[--text] md:hidden",
        "pb-[env(safe-area-inset-bottom)] transition-transform duration-[--dur] ease-out",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      // Out of the tab order and away from assistive tech while parked off
      // screen, as MobileJoinBar does.
      aria-hidden={!visible || undefined}
      inert={!visible || undefined}
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="t-micro m-0 text-[--text-secondary]">{place}</p>
          <p className="m-0 mt-0.5 truncate font-display text-body-s font-medium text-[--text]">{dates}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button href={href} variant="primary" size="md">
            Reserve
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="grid h-11 w-11 place-items-center text-[--text-muted] transition-colors duration-fast hover:text-[--text]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
