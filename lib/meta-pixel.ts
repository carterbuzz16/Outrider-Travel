/**
 * The Meta Pixel, and every rule about when it may speak.
 *
 * Added 29 September 2026 so paid Instagram ads can reach people who have
 * visited the site (a website Custom Audience in Meta Ads Manager). The
 * privacy policy was changed in the same commit, to version 1.3.0; the two
 * have to stay in step, and every promise it makes about the pixel is kept
 * here:
 *
 *   - Only the live site. Previews, local runs and the checkout sandbox never
 *     load it, so test traffic and test bookings stay out of the audience.
 *   - Never a URL that carries a credential. The same parameters Telemetry.tsx
 *     strips from analytics, plus the discount code and the sign-in link's
 *     token: a working trip-page link, penthouse invite or single-use $500
 *     code sitting in Meta's event log is a working credential somewhere we
 *     cannot delete it. fbevents.js reads location.href and document.referrer
 *     itself and offers no hook to clean them, so the only safe answer is not
 *     to send an event at all while either one carries a secret.
 *   - Never a page view we did not choose to send. disablePushState stops the
 *     pixel counting client-side navigations on its own (it would count the
 *     secret-bearing ones too), and autoConfig off stops it collecting button
 *     text and page metadata. Page views come only from components/MetaPixel.
 *   - Opt-outs win. A Global Privacy Control signal, or the switch on the
 *     privacy page (stored on this browser only), keeps the script from loading
 *     at all, and revokes it if it already has.
 *   - Not in Europe. The policy's GDPR section has no consent basis for ad
 *     tracking, so the pixel stays off when the device's time zone is European.
 *     A time zone rather than a geolocation lookup, which would need the
 *     middleware on every marketing page (see its matcher note) or a cookie.
 *     It errs towards not tracking: a US student on a semester abroad is left
 *     out, which is the right way round.
 *
 * No name, email address, phone number or form content is ever passed to fbq.
 * Automatic advanced matching, Meta's option to read those out of forms on
 * the page, must stay switched off in Events Manager, because the policy says
 * none of it is sent.
 */

export const META_PIXEL_ID = "1109966388146467";

/** Inlined at build time by Vercel; absent locally, "preview" on previews. */
export const PIXEL_ENABLED = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

const OPT_OUT_KEY = "outrider:ads-opt-out";

/** Credentials that ride in query strings. Keep in step with Telemetry.tsx. */
const SECRET_PARAMS = ["t", "group", "code", "token_hash", "token"];

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: unknown;
  loaded?: boolean;
  version?: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

/** True when neither the URL nor a `next` inside it carries a credential. */
export function urlCarriesNoSecret(href: string): boolean {
  if (!href) return true;
  try {
    const url = new URL(href);
    const hit = (u: URL) => SECRET_PARAMS.some((name) => u.searchParams.has(name));
    if (hit(url)) return false;
    // /login?next=/bookings/new?group=CODE carries the code one level down.
    const next = url.searchParams.get("next");
    return !(next && hit(new URL(next, url.origin)));
  } catch {
    // Unparseable is unknown, and unknown is not safe.
    return false;
  }
}

/** EEA, UK and Swiss devices, plus the few EU places outside Europe/. */
function inEurope(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return (
      zone.startsWith("Europe/") ||
      zone === "Asia/Nicosia" ||
      zone === "Asia/Famagusta" ||
      zone === "Arctic/Longyearbyen" ||
      ["Azores", "Madeira", "Canary", "Reykjavik", "Faroe"].some((z) => zone === `Atlantic/${z}`)
    );
  } catch {
    return false;
  }
}

export function gpcSignal(): boolean {
  return typeof navigator !== "undefined" && navigator.globalPrivacyControl === true;
}

export function adsOptedOut(): boolean {
  if (gpcSignal()) return true;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    // Storage blocked (a private window, say): the only opt-out we can still
    // see is GPC, already checked above.
    return false;
  }
}

/** The privacy page's switch. Stored on this browser only. */
export function setAdsOptOut(optOut: boolean) {
  try {
    if (optOut) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Nothing to store into; the revoke below still stops this page.
  }
  // If the pixel is already on this page, stop or resume it here and now.
  window.fbq?.("consent", optOut ? "revoke" : "grant");
}

/** Whether this page, right now, may send anything to Meta. */
function mayTrack(): boolean {
  return (
    PIXEL_ENABLED &&
    typeof window !== "undefined" &&
    !adsOptedOut() &&
    !inEurope() &&
    urlCarriesNoSecret(window.location.href) &&
    urlCarriesNoSecret(document.referrer)
  );
}

/**
 * Meta's base snippet, written out rather than pasted as an inline script so
 * it can be held back until mayTrack() allows it. Idempotent.
 */
function load() {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    // Bound to fbq, as in Meta's snippet: fbevents.js relies on `this`.
    if (fbq.callMethod) fbq.callMethod.call(fbq, ...args);
    else fbq.queue!.push(args);
  };
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  fbq.disablePushState = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
}

/** A page view, for components/MetaPixel. Loads the pixel the first time. */
export function pixelPageView() {
  if (!mayTrack()) return;
  load();
  window.fbq!("track", "PageView");
}

/**
 * A standard event (Lead, InitiateCheckout, Purchase), under exactly the same
 * rules as a page view. It may be the first thing to load the pixel: effects
 * run child-first, so on a direct load of the checkout page its event fires
 * before the root layout's page view does.
 */
export function pixelEvent(name: string, params?: { value: number; currency: string }) {
  if (!mayTrack()) return;
  load();
  window.fbq!("track", name, params);
}
