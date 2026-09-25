import "server-only";
import { cookies } from "next/headers";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/site-url";
import { getFromAddress, renderEarlyAccess, sendEmail } from "@/lib/email/send";
import { formatPrice, getPublishedTrips } from "@/lib/trips";

/**
 * The list's head start: booking opens to waitlist members before it opens to
 * everyone (the site has promised "early access" and "the list hears before
 * it goes on sale" since the waitlist went up).
 *
 * How it works:
 *   1. Each signup has an early_access_token (a random uuid, its own column,
 *      see prisma/migrations/20260925120000_waitlist_early_access).
 *   2. /admin/launch emails every member a link, /early-access?t=<token>.
 *      Until that email goes out nobody holds a token, so there is no switch
 *      to flip for the head start itself: sending is what starts it.
 *   3. The link sets an httpOnly cookie holding the token and sends them on
 *      to /bookings/new, through login if they need it.
 *   4. The booking page and createBooking ask bookingsOpenForViewer() rather
 *      than reading BOOKINGS_OPEN alone.
 *   5. While it runs, anyone who joins the list gets their link straight away
 *      (sendEarlyAccessOnJoin, called from app/waitlist-actions.ts), so with
 *      the trip details public, joining the list is how you book.
 *   6. When the head start is over, the team sets LAUNCHED in
 *      lib/booking-window.ts and deploys, as they would have anyway, and this
 *      stops mattering.
 *
 * The token is checked against the table on every use, so unsubscribing
 * closes the door, and a made-up token opens nothing. A forwarded link does
 * work, on purpose: the list books with their friends, and a head start only
 * the list member could use would split every group at the checkout.
 *
 * Marketing pages stay as the public sees them (no prices, "coming soon").
 * The email carries what someone needs to choose, and the booking page shows
 * every package with its price.
 */

export const EARLY_ACCESS_COOKIE = "outrider_early_access";

/** Thirty days: long enough to outlast any head start, and the cookie is re-checked every time. */
export const EARLY_ACCESS_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shape-checks before any query, so junk never reaches the database. */
export function isEarlyAccessToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * The list member a token belongs to, or null for an unknown token or one
 * whose owner has unsubscribed. Service role: the table has RLS on and no
 * policies, like every other waitlist read.
 */
export async function findEarlyAccessMember(token: string): Promise<{ id: string; email: string } | null> {
  if (!isEarlyAccessToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from("waitlist_signups")
    .select("id, email")
    .eq("early_access_token", token.toLowerCase())
    .is("unsubscribed_at", null)
    .maybeSingle();
  if (error) {
    console.error(`Early access lookup failed: ${error.code} ${error.message}`);
    return null;
  }
  return data;
}

/** True when this visitor came in through a live early-access link. */
export async function hasEarlyAccess(): Promise<boolean> {
  const token = (await cookies()).get(EARLY_ACCESS_COOKIE)?.value;
  if (!isEarlyAccessToken(token)) return false;
  return (await findEarlyAccessMember(token)) !== null;
}

/**
 * Whether this visitor can book right now: everyone once LAUNCHED is set,
 * and before that, only the list. Skips the cookie and the query entirely
 * once booking is open to all.
 */
export async function bookingsOpenForViewer(): Promise<boolean> {
  return BOOKINGS_OPEN || (await hasEarlyAccess());
}

/** The personal link in the head-start email. */
export function earlyAccessUrl(token: string): string {
  return `${getAppUrl().replace(/\/+$/, "")}/early-access?t=${encodeURIComponent(token)}`;
}

/**
 * Whether the head start is running: booking is not yet open to everyone,
 * and the list has been sent its links (at least one row is stamped). The
 * stamp is the record that /admin/launch pressed send, so there is no
 * separate switch to keep in step with it.
 */
export async function headStartActive(): Promise<boolean> {
  if (BOOKINGS_OPEN) return false;
  const { count, error } = await createAdminClient()
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true })
    .not("early_access_sent_at", "is", null);
  if (error) {
    console.error(`Head start check failed: ${error.code} ${error.message}`);
    return false;
  }
  return (count ?? 0) > 0;
}

/** The cheapest published package, for the email's "From" line, or null. */
export async function earlyAccessFromPrice(): Promise<string | null> {
  const prices = (await getPublishedTrips()).map((trip) => trip.priceFrom).filter((p) => p > 0);
  return prices.length ? formatPrice(Math.min(...prices)) : null;
}

/**
 * For a brand-new signup: if the head start is running, email them their
 * booking link now and stamp the row, and return true. Returns false when
 * there is no head start or the send failed, and the caller sends the
 * ordinary welcome instead, so nobody who joins hears nothing.
 */
export async function sendEarlyAccessOnJoin(
  email: string,
  tokens: { earlyAccess: string; unsubscribe: string },
): Promise<boolean> {
  if (!(await headStartActive())) return false;

  const rendered = renderEarlyAccess({
    bookingUrl: earlyAccessUrl(tokens.earlyAccess),
    unsubscribeToken: tokens.unsubscribe,
    fromPrice: await earlyAccessFromPrice(),
  });
  try {
    await sendEmail({
      from: getFromAddress(),
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: rendered.headers,
    });
  } catch (err) {
    console.error("EARLY ACCESS ON JOIN FAILED: sending the welcome instead.", err);
    return false;
  }

  const { error } = await createAdminClient()
    .from("waitlist_signups")
    .update({ early_access_sent_at: new Date().toISOString() })
    .eq("early_access_token", tokens.earlyAccess);
  if (error) console.error(`Early access stamp on join failed: ${error.code} ${error.message}`);
  return true;
}
