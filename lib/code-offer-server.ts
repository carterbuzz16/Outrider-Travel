import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { discountCodeAmount, normalizeDiscountCode } from "@/lib/discount-codes";
import { OFFER_CODE_PREFIX, OFFER_COOKIE, isOfferCode } from "@/lib/code-offer";

/*
 * The server half of the $100-by-email offer (lib/code-offer.ts): making a
 * code, and the cookie that carries it to checkout.
 *
 * Why a cookie. The sheet shows the code and its "Book with my code" button
 * goes to /bookings/new?code=, but most people who book will tap one of the
 * other Reserve buttons on the page (the masthead, a room card, the phone
 * bar), and none of those carry a code. Without this they would reach checkout
 * at full price with their $100 sitting in an email. So the action sets a
 * cookie, and /bookings/new applies it when the link brings no code of its
 * own. It also keeps the code out of the address bar on those buttons, which
 * is what lets the Meta Pixel still count the checkout (lib/meta-pixel.ts
 * stays silent on any URL carrying a code).
 *
 * httpOnly, so page scripts never read it, and only ever an OFFER_CODE_PREFIX
 * code: a hand-set cookie holding some other code is ignored.
 *
 * Which is also why the cookie is not counted against the per-IP caps that
 * stop codes being guessed (checkout's discount-check and discount-claim-ip).
 * Those caps protect giveaway codes, and the cookie can never carry one. An
 * offer code is worth guessing to nobody, since anyone can have their own for
 * an email address. Counted, every checkout page load would spend the cap, and
 * on a campus network, where a whole hall shares one address, it would run
 * out and take people's codes off at checkout without a word.
 */

/** 32 letters and digits, without 0, O, 1 and I, which are misread when typed from an email. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 6;

/** TELLURIDE plus six random characters: about a billion codes, so none can be guessed. */
export function generateOfferCode(): string {
  const bytes = randomBytes(RANDOM_LENGTH);
  // 256 is a multiple of 32, so taking each byte mod 32 is unbiased.
  return OFFER_CODE_PREFIX + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function setOfferCookie(code: string, expiresAt: Date) {
  (await cookies()).set(OFFER_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The offer code in this browser's cookie, if it holds one. Not checked against the database. */
export async function offerCodeFromCookie(): Promise<string | null> {
  const code = normalizeDiscountCode((await cookies()).get(OFFER_COOKIE)?.value);
  return code && isOfferCode(code) ? code : null;
}

/**
 * The cookie's code while it can still be used, with when it runs out; null
 * once it is used, expired or switched off, or when there is no cookie.
 *
 * For /api/welcome-credit, which the page asks on every load. `userId` is the
 * visitor's account, when signed in, so their own unpaid checkout holding the
 * code (for its 30 minutes) does not make it look used to them.
 */
export async function liveOfferFromCookie(userId?: string): Promise<{ code: string; expiresAt: string } | null> {
  const code = await offerCodeFromCookie();
  if (!code) return null;

  const admin = createAdminClient();
  const [amount, row] = await Promise.all([
    discountCodeAmount(admin, code, userId),
    admin.from("discount_codes").select("expires_at").eq("code", code).maybeSingle(),
  ]);
  if (amount === null || row.error || !row.data?.expires_at) return null;
  return { code, expiresAt: row.data.expires_at };
}
