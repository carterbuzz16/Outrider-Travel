/*
 * The referral cookie: which ambassador sent this browser (27 October 2026).
 *
 * Any page opened with ?ref=<code>, for example outrider.travel/telluride?ref=stein,
 * remembers that ambassador for 30 days, and checkout fills its "Referred by"
 * box from it (lib/referral.ts). middleware.ts sets it, before the page
 * renders, and only for a live ambassador code: a ref that matches nothing
 * leaves the cookie as it was, so a mistyped second link never wipes a good
 * first one. A second ambassador's good link replaces the first: the most
 * recent wins.
 *
 * Pure and edge-safe: the middleware imports it, and cannot import the
 * server-only modules that talk to the database through the admin client.
 */

export const REFERRAL_COOKIE = "outrider_ref";
export const REFERRAL_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const REFERRAL_COOKIE_OPTIONS = {
  // Read on the server only, at checkout. No page script needs it.
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: REFERRAL_MAX_AGE_SECONDS,
};

/**
 * A code as discount_codes stores it, by the same rule as
 * normalizeDiscountCode (lib/discount-codes.ts), so ?ref=stein, ?ref=Stein
 * and ?ref=STEIN are one ambassador. Null when nothing usable is left.
 */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  return code.length > 0 ? code : null;
}

/**
 * Whether a discount_codes row is an ambassador's code that can be used now:
 * worth $0 (an attribution code, tracking_only_codes migration), switched on,
 * and not past its expires_at. A code that takes money off is never one,
 * however it is typed.
 */
export function isLiveAttributionCode(
  row: { amount: number | string | null; percent_off: number | null; active: boolean; expires_at: string | null },
  now: Date = new Date(),
): boolean {
  return (
    row.amount !== null &&
    Number(row.amount) === 0 &&
    row.percent_off === null &&
    row.active &&
    (row.expires_at === null || Date.parse(row.expires_at) > now.getTime())
  );
}
