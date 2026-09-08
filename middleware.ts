import { NextResponse, type NextRequest } from "next/server";
import { requiresAuth, updateSession } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!STYLEGUIDE_ENABLED && (pathname === "/style" || pathname.startsWith("/style/"))) {
    // Rewriting to an unmatched path renders the app's own 404 page with a
    // 404 status, rather than handing back a bare empty response.
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  }

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
   * What remains: the authenticated areas, the auth routes themselves, and
   * /style (whose 404 gate above has to run).
   */
  matcher: [
    "/style/:path*",
    "/style",
    "/bookings/:path*",
    "/admin/:path*",
    "/auth/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
