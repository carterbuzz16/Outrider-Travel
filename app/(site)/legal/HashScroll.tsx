"use client";

import { useEffect } from "react";

/**
 * Scrolls to the #section in the URL when a legal page loads.
 *
 * These documents are long and are deep-linked constantly — the footer points
 * at /terms#cancellation, /cancellation redirects to it, and the other two
 * documents cross-reference sections of the Terms. The browser's own fragment
 * scroll does not survive App Router hydration on a hard load (the router
 * settles the scroll position after the browser has already jumped), so a
 * reader following one of those links lands at the top of a nineteen-section
 * document and has to go looking. This puts them where they were sent.
 *
 * Runs after two frames so it happens once layout has settled and after the
 * router's own scroll handling, and `scrollIntoView` honours the `scroll-mt`
 * on each section, so the heading clears the fixed nav.
 */
export default function HashScroll() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;

    let frame = 0;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView();
      });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
