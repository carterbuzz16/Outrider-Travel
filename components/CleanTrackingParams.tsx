"use client";

import { useEffect } from "react";

/**
 * Takes campaign tags out of the address bar once they have been read, so a
 * visitor from an ad sees outrider.travel/telluride/december rather than a
 * string of utm_ and fbclid parameters (owner, 29 September 2026).
 *
 * Read first, then removed. AttributionCapture (the (site) layout) keeps the
 * tags for the waitlist on mount, which runs before this. Vercel Analytics
 * reports the landing URL as the page loads. The Meta Pixel needs fbclid,
 * the ad's click id, which it turns into its _fbc cookie when fbevents.js
 * loads and works through its queue; so this waits until the pixel has loaded
 * (callMethod is set by fbevents.js), or until it is clear it will not, and
 * never less than 1.5 seconds.
 *
 * Only these tags. Anything else in the query string (a discount code, a
 * group code, a trip-page token) is the page's own business and stays.
 */
const TRACKING = /^(utm_[a-z_]+|fbclid|gclid|src|ref)$/;
const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 5000;

export default function CleanTrackingParams() {
  useEffect(() => {
    const landing = new URL(window.location.href);
    const drop = [...landing.searchParams.keys()].filter((key) => TRACKING.test(key));
    if (drop.length === 0) return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      const waited = Date.now() - started;
      const fbq = window.fbq;
      const pixelSettled = !fbq || typeof fbq.callMethod === "function";
      if (!(waited >= MAX_WAIT_MS || (pixelSettled && waited >= MIN_WAIT_MS))) return;

      window.clearInterval(timer);
      const now = new URL(window.location.href);
      // The visitor has already moved on; that page's URL is not ours to edit.
      if (now.pathname !== landing.pathname) return;
      for (const key of drop) now.searchParams.delete(key);
      // null, not window.history.state. Next's router only takes notice of a
      // replaceState whose state is not its own; handed its own state back, it
      // kept the tagged URL as the page's address, and the next refresh (a
      // server action setting a cookie, as the $100 sheet does) put the tags
      // back in the address bar. Given null, Next copies its state across and
      // adopts the clean URL.
      window.history.replaceState(null, "", `${now.pathname}${now.search}${now.hash}`);
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
