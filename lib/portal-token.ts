import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/site-url";

/**
 * Signed links to a booking's trip portal (/trip/[bookingId]?t=...).
 *
 * The portal is how a traveler books flights, asks for a roommate and hands
 * over their details without logging in: the link arrives in the confirmation
 * email, a 72-hour follow-up and, later, texts. So the link itself is the
 * credential, and this module is the whole of its security.
 *
 * Token format: `<expiry>.<signature>`
 *   expiry     Unix seconds, base 36 (short, url-safe, no padding).
 *   signature  base64url HMAC-SHA256 over "portal:v1:<bookingId>:<expiry>",
 *              keyed with PORTAL_TOKEN_SECRET.
 *
 * The booking id is not in the token. It is signed, and it is taken from the
 * URL path, so a valid token for one booking verifies for nothing else: change
 * the id in the path and the MAC no longer matches. The "v1" in the signed
 * string lets the format change later without old tokens verifying under new
 * rules.
 *
 * Server-only: it reads the secret. Node's crypto is used rather than Web
 * Crypto because timingSafeEqual is what makes the comparison safe, and every
 * caller (pages, server actions, email senders) runs on the Node runtime.
 */

/**
 * How long a link works. Long on purpose: the same link goes out at booking
 * and again in a follow-up days later, and travelers dig the first email out
 * of their inbox weeks after that. A short expiry would mostly break links for
 * the people it was meant to help. A reader whose link has lapsed can ask for
 * a fresh one on the page itself, and that one only ever goes to the booking's
 * own email address.
 */
export const PORTAL_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const TOKEN_VERSION = "v1";

// 32 hex characters is 128 bits; `openssl rand -hex 32` gives 64. Anything
// shorter is almost certainly a placeholder somebody forgot to replace.
const MIN_SECRET_LENGTH = 32;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(): string | null {
  const secret = process.env.PORTAL_TOKEN_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    // Fail closed. Without a real key there is no way to tell a link we sent
    // from one somebody typed, so nobody gets in and nothing gets minted.
    // The log names the variable and never its value.
    console.error(
      "PORTAL_TOKEN_SECRET is missing or shorter than 32 characters; trip portal links are disabled."
    );
    return null;
  }
  return secret;
}

function sign(secret: string, bookingId: string, expiry: string): Buffer {
  // Lower-cased so the same booking signs the same way however the id was
  // capitalised in the URL. Postgres compares uuids case-insensitively too.
  return createHmac("sha256", secret)
    .update(`portal:${TOKEN_VERSION}:${bookingId.toLowerCase()}:${expiry}`)
    .digest();
}

export function isBookingId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** A token for this booking, or null when the portal is switched off. */
export function createPortalToken(
  bookingId: string,
  ttlSeconds: number = PORTAL_TOKEN_TTL_SECONDS
): string | null {
  const secret = getSecret();
  if (!secret || !isBookingId(bookingId)) return null;

  const expiry = (Math.floor(Date.now() / 1000) + ttlSeconds).toString(36);
  return `${expiry}.${sign(secret, bookingId, expiry).toString("base64url")}`;
}

/**
 * The absolute portal URL to put in an email or text, or null when
 * PORTAL_TOKEN_SECRET is not configured. Callers leave the link out rather
 * than send one that cannot work.
 *
 * Absolute via lib/site-url.ts, because these are opened later and elsewhere:
 * a phone, a forwarded group chat.
 */
export function createPortalUrl(bookingId: string): string | null {
  const token = createPortalToken(bookingId);
  if (!token) return null;
  return `${getAppUrl()}/trip/${encodeURIComponent(bookingId.toLowerCase())}?t=${token}`;
}

/**
 * Fragments on the portal page, one per task. The page puts them on its task
 * list items and the emails append them to the portal URL (rooming_url and
 * traveler_details_url in lib/email/post-booking.ts), so they live here, the
 * one module both already import.
 */
export const PORTAL_ANCHORS = { flights: "flights", rooming: "rooming", details: "details" } as const;

export type PortalTokenResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "disabled" };

/**
 * Checks a token against the booking id it is being used for.
 *
 * Signature before expiry, so "expired" is only ever said about a link we
 * really issued. Anything else is "invalid", whatever was wrong with it.
 */
export function verifyPortalToken(bookingId: string, token: string | null | undefined): PortalTokenResult {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: "disabled" };

  if (!token || token.length > 128 || !isBookingId(bookingId)) return { ok: false, reason: "invalid" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };
  const [expiry, signature] = parts;
  if (!/^[0-9a-z]{1,12}$/.test(expiry) || !/^[A-Za-z0-9_-]+$/.test(signature)) {
    return { ok: false, reason: "invalid" };
  }

  const expected = sign(secret, bookingId, expiry);
  const given = Buffer.from(signature, "base64url");
  // timingSafeEqual throws on a length mismatch, and the length of a SHA-256
  // digest is public anyway, so checking it first leaks nothing.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "invalid" };
  }

  const expiresAt = parseInt(expiry, 36);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}
