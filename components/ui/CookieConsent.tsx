"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "./Button";
import {
  CONSENT_VERSION,
  TRACKING_ENABLED,
  type ConsentValue,
  hasDecided,
  setConsent,
} from "@/lib/consent";

/**
 * Cookie notice — a bottom-anchored band, not a modal.
 *
 * Three things about this component are deliberate and should survive any
 * redesign:
 *
 * 1. **It usually does not render.** `TRACKING_ENABLED` in lib/consent.ts is
 *    false while the site sets nothing but strictly-necessary cookies, and a
 *    banner asking permission for cookies that need no permission is theatre
 *    that teaches people to click through consent UI without reading it. See
 *    the audit note at the top of lib/consent.ts.
 *
 * 2. **Reject is the same control as Accept.** Same variant, same size, same
 *    row, adjacent. Making refusal harder than acceptance is what the EDPB and
 *    the French and German regulators have repeatedly fined companies over; it
 *    is a compliance requirement, not a styling choice. If a future change
 *    makes Accept a filled button, Reject becomes one too.
 *
 * 3. **It is a region, not a dialog.** No focus trap, no scrim, no blocked
 *    scroll. The page stays usable while the notice sits at the bottom, and
 *    the notice is reachable by keyboard at the end of the tab order.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // Nothing renders on the server or on the first client paint: `visible`
  // starts false and only an effect can raise it. That is what keeps the
  // markup identical across hydration, and it means the banner can never
  // flash in for someone who already answered.
  useEffect(() => {
    if (!TRACKING_ENABLED) return;
    setVisible(!hasDecided());
  }, []);

  const decide = useCallback((value: ConsentValue) => {
    setConsent(value);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Escape dismisses — as a rejection, never as an acceptance. Walking away
    // from the question is not consent, so the conservative reading is the
    // only safe one to persist.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") decide("rejected");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, decide]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      // Charcoal so the band reads as chrome rather than as another section of
      // the page, and `animate-rise` for the entrance — globals.css already
      // collapses every animation to nothing under prefers-reduced-motion, so
      // this resolves instantly for anyone who asked for that.
      className="scheme-charcoal scheme-paint animate-rise fixed inset-x-0 bottom-0 z-50 border-t border-[--rule-strong]"
    >
      <div className="shell flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:gap-10 md:py-6">
        <div className="min-w-0">
          <p className="t-micro text-[--text-secondary]">Cookies</p>
          <p className="mt-2 max-w-measure font-body text-body-s leading-[1.6] text-[--text]">
            Some cookies are needed to run the site. We&rsquo;d also like
            analytics cookies to see how it is used. Those run only if you
            accept.
          </p>
        </div>

        {/*
          Equal weight, deliberately. Both are `secondary` at the same size and
          sit side by side; on a narrow screen they stack full-width, still
          identical. The privacy link is `ghost` because it is not a third
          answer to the question. It is where you go to read more first.
        */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="secondary" size="sm" onClick={() => decide("accepted")}>
            Accept
          </Button>
          <Button variant="secondary" size="sm" onClick={() => decide("rejected")}>
            Reject
          </Button>
          <Button variant="ghost" size="sm" href="/privacy" className="sm:ml-2">
            Privacy policy
          </Button>
        </div>
      </div>

      {/* Not shown; gives assistive tech the version the choice is recorded against. */}
      <span className="sr-only">Policy version {CONSENT_VERSION}</span>
    </div>
  );
}
