/*
 * The referral link (?ref=, middleware.ts and lib/referral-cookie.ts): a live
 * ambassador code sets a first-party cookie with the right attributes; an
 * invalid, non-ambassador or rate-limited one is ignored silently; a code
 * typed at checkout wins over the cookie.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import type * as ReferralCookie from "@/lib/referral-cookie";

type Fake = { codes: Record<string, { amount: number; percent_off: number | null; active: boolean; expires_at: string | null }>; limited: boolean };
const fake: Fake = { codes: {}, limited: false };
const seen: string[] = [];
const realFetch = globalThis.fetch;

let middleware: (req: NextRequest) => Promise<Response>;
// Loaded after the environment is set: the cookie's Secure flag is read from
// NODE_ENV when lib/referral-cookie.ts loads, as it is on Vercel.
let attributionSource: typeof ReferralCookie.attributionSource;
let isLiveAttributionCode: typeof ReferralCookie.isLiveAttributionCode;
let normalizeReferralCode: typeof ReferralCookie.normalizeReferralCode;

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://db.test",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-test",
  });
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    seen.push(url);
    if (url.includes("/rpc/check_rate_limit")) return Response.json(!fake.limited);
    const code = new URL(url).searchParams.get("code")?.replace(/^eq\./, "") ?? "";
    // The query joins ambassadors!inner, so a $0 code with no ambassador returns no row.
    const row = fake.codes[code];
    return Response.json(row ? [{ ...row, ambassadors: { code } }] : []);
  }) as typeof fetch;
  ({ middleware } = (await import("../middleware")) as unknown as { middleware: typeof middleware });
  ({ attributionSource, isLiveAttributionCode, normalizeReferralCode } = await import("@/lib/referral-cookie"));
});

after(() => {
  globalThis.fetch = realFetch;
});

const live = { amount: 0, percent_off: null, active: true, expires_at: "2099-01-01T00:00:00Z" };

function request(path: string) {
  return new NextRequest(`https://outrider.travel${path}`, { headers: { "x-vercel-forwarded-for": "203.0.113.9" } });
}

test("a live ambassador code sets an HttpOnly, Secure, SameSite=Lax, 30-day cookie", async () => {
  fake.codes = { STEIN: live };
  fake.limited = false;
  const res = await middleware(request("/telluride?ref=stein"));
  const header = res.headers.get("set-cookie") ?? "";
  assert.match(header, /outrider_ref=STEIN/);
  assert.match(header, /HttpOnly/i);
  assert.match(header, /Secure/i);
  assert.match(header, /SameSite=lax/i);
  assert.match(header, /Max-Age=2592000/);
  assert.match(header, /Path=\//);
});

test("an unknown, expired, discount or non-ambassador code is ignored silently", async () => {
  fake.codes = {
    OLD: { ...live, expires_at: "2020-01-01T00:00:00Z" },
    CHPTR: { ...live, amount: 150 },
    OFF: { ...live, active: false },
  };
  for (const ref of ["nobody", "old", "chptr", "off", "", "<script>alert(1)</script>"]) {
    const res = await middleware(request(`/?ref=${encodeURIComponent(ref)}`));
    assert.equal(res.headers.get("set-cookie")?.includes("outrider_ref") ?? false, false, `ref=${ref}`);
    assert.equal(res.status < 400, true);
  }
});

test("the raw parameter never reaches the lookup: only letters and digits do", async () => {
  seen.length = 0;
  await middleware(request(`/?ref=${encodeURIComponent("st'ein&code=eq.CHPTR")}`));
  const lookup = seen.find((u) => u.includes("/discount_codes"));
  assert.ok(lookup);
  assert.equal(new URL(lookup!).searchParams.get("code"), "eq.STEINCODEEQCHPTR");
});

test("over the rate limit, even a good code is ignored", async () => {
  fake.codes = { STEIN: live };
  fake.limited = true;
  const res = await middleware(request("/telluride?ref=stein"));
  assert.equal(res.headers.get("set-cookie")?.includes("outrider_ref") ?? false, false);
  fake.limited = false;
});

test("normalizing and liveness", () => {
  assert.equal(normalizeReferralCode(" Stein "), "STEIN");
  assert.equal(normalizeReferralCode("../"), null);
  assert.equal(normalizeReferralCode(42), null);
  assert.equal(isLiveAttributionCode(live), true);
  assert.equal(isLiveAttributionCode({ ...live, percent_off: 10 }), false);
});

test("a code typed at checkout beats the cookie; 'link' only when both agree", () => {
  assert.equal(attributionSource("STEIN", "link", "STEIN"), "link");
  assert.equal(attributionSource("DUNKLE", "link", "STEIN"), "typed");
  assert.equal(attributionSource("DUNKLE", "typed", "STEIN"), "typed");
  assert.equal(attributionSource("STEIN", "typed", "STEIN"), "typed");
  assert.equal(attributionSource("STEIN", "link", null), "typed");
});
