import { NextResponse, type NextRequest } from "next/server";
import { requiresAuth, updateSession } from "@/lib/supabase/middleware";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_OPTIONS,
  isLiveAttributionCode,
  normalizeReferralCode,
} from "@/lib/referral-cookie";
import { ipFromHeaders } from "@/lib/ip";

/*
 * The styleguide (/style) is an internal reference and is not part of the
 * public site. It renders under `npm run dev` and is a 404 anywhere else.
 *
 * This check lives in middleware rather than in the page because a page-level
 * notFound() on a statically prerendered route still answers 200: the body is
 * the not-found UI, but the route plainly exists. Blocking here means the
 * request never reaches the page and the status is a real 404. The page keeps
 * its own guard as well, so the content cannot render even if this matcher
 * changes.
 *
 * Set ENABLE_STYLEGUIDE=1 on an environment (a Vercel preview, say) to expose
 * it there. Read at build time, so flipping it needs a redeploy.
 */
const STYLEGUIDE_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_STYLEGUIDE === "1";

/*
 * The session paths: everything the matcher below listed before referral
 * links. Any other page reaches the middleware only because it carries
 * ?ref=, and needs no session refreshed for that.
 */
const SESSION_PATHS = [
  "/style",
  "/bookings",
  "/admin",
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/ambassador/dashboard",
];

function isSessionPath(pathname: string): boolean {
  return SESSION_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/*
 * ?ref= lookups per IP: 60 in ten minutes is far more than any visitor
 * clicking links, and stops a script walking the alphabet to find which codes
 * set a cookie. Counted by check_rate_limit (lib/rate-limit.ts), called over
 * PostgREST because that module is server-only.
 */
const REF_LOOKUPS_PER_WINDOW = 60;
const REF_WINDOW_SECONDS = 10 * 60;

/**
 * The ambassador code in ?ref=, if it is live (lib/referral-cookie.ts) and
 * belongs to an ambassador (the inner join on ambassadors), read straight
 * from PostgREST with the service role: the admin client module is
 * server-only and cannot load here. The code is letters and digits only once
 * normalized, so it is safe in the query string as it stands; the raw
 * parameter itself is never echoed anywhere. Any failure is a "no": the
 * visitor simply is not credited, and the page is never held up.
 *
 * The rate limit is asked at the same time as the lookup, so it adds no
 * wait, and a refused one throws the answer away. It fails open: a database
 * fault there must not stop real referrals being credited.
 */
async function liveReferral(raw: string | null, ip: string): Promise<string | null> {
  const code = normalizeReferralCode(raw);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!code || !url || !key) return null;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const signal = AbortSignal.timeout(2000);
  try {
    const [allowed, res] = await Promise.all([
      fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ p_key: `ref-ip:${ip}`.slice(0, 200), p_max: REF_LOOKUPS_PER_WINDOW, p_window_seconds: REF_WINDOW_SECONDS }),
        cache: "no-store",
        signal,
      })
        .then(async (r) => (r.ok ? (await r.json()) !== false : true))
        .catch(() => true),
      fetch(
        `${url}/rest/v1/discount_codes?select=amount,percent_off,active,expires_at,ambassadors!inner(code)&code=eq.${code}`,
        { headers, cache: "no-store", signal },
      ),
    ]);
    if (!allowed || !res.ok) return null;
    const rows = (await res.json()) as Parameters<typeof isLiveAttributionCode>[0][];
    return rows[0] && isLiveAttributionCode(rows[0]) ? code : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // A referral link (?ref=, lib/referral-cookie.ts). Set on the request as
  // well as the response, so the page rendering now already sees it: a
  // visitor who lands straight on checkout with ?ref= has the box filled.
  const ref = request.nextUrl.searchParams.get("ref");
  const referral = ref === null ? null : await liveReferral(ref, ipFromHeaders(request.headers));
  if (referral) request.cookies.set(REFERRAL_COOKIE, referral);

  const response = await route(request);
  if (referral) response.cookies.set(REFERRAL_COOKIE, referral, REFERRAL_COOKIE_OPTIONS);
  return response;
}

async function route(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!STYLEGUIDE_ENABLED && (pathname === "/style" || pathname.startsWith("/style/"))) {
    // Rewriting to an unmatched path renders the app's own 404 page with a
    // 404 status, rather than handing back a bare empty response.
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  }

  if (!isSessionPath(pathname)) return NextResponse.next({ request });

  /*
   * updateSession() calls supabase.auth.getUser(), a network round trip to
   * Supabase. With no auth cookie there is no session to refresh, so that call
   * buys nothing and costs a few hundred milliseconds in front of the page.
   *
   * But skipping it entirely is not enough: updateSession is also what bounces
   * a signed-out visitor to /login with `next` set to where they were going.
   * Returning early here let those requests fall through to the protected
   * layout, which has no access to the path and can only send everyone to a
   * generic /bookings. That silently broke every deep link mailed out, which
   * is exactly the case that matters: the 3DS "verify this payment" email
   * points at one specific payment, and its recipient is usually logged out.
   *
   * So: no cookie on a protected path is answered here, with the right `next`
   * and without asking Supabase about a session that cannot exist. That is
   * both correct and faster than it was before.
   */
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!hasAuthCookie) {
    if (requiresAuth(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

export const config = {
  /*
   * Deliberately narrow.
   *
   * This previously matched every path except "/" and static assets, which put
   * a Supabase round trip in front of /trips, /about, every trip page and every
   * legal page, for anonymous visitors who have no session at all. Marketing
   * pages need no session, so they are no longer matched.
   *
   * What remains: the authenticated areas (the ambassador portal among them),
   * the auth routes themselves, and /style (whose 404 gate above has to run).
   * Plus any page at all that
   * carries ?ref=, an ambassador's referral link, which is answered without
   * a session round trip (isSessionPath). Not API routes or build assets.
   */
  matcher: [
    {
      source: "/((?!api/|_next/|.*\\.[a-z0-9]+$).*)",
      has: [{ type: "query", key: "ref" }],
    },
    "/style/:path*",
    "/style",
    "/bookings/:path*",
    "/ambassador/dashboard",
    "/ambassador/dashboard/:path*",
    "/admin/:path*",
    "/auth/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
