import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route prefixes that require a signed-in user. This is a coarse,
// edge-runtime gate (redirect-if-logged-out only) — role-based checks like
// the admin gate live in the relevant layout, close to the data, since
// middleware here can't reach the database.
export const PROTECTED_PREFIXES = ["/bookings"];
export const ADMIN_PREFIX = "/admin";

/** Does this path require a signed-in user? */
export function requiresAuth(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith(ADMIN_PREFIX)
  );
}

/*
 * Never let the session refresh take the page down with it. A throw here is a
 * bare Vercel 500 (MIDDLEWARE_INVOCATION_FAILED) on every signed-in request,
 * which is what a missing Supabase env var on one environment produced. On any
 * failure: send a protected path to the login page, and let everything else
 * render as if signed out. The error is logged so the cause is still visible.
 */
export async function updateSession(request: NextRequest) {
  try {
    return await refreshSession(request);
  } catch (err) {
    console.error(
      `middleware: session refresh failed for ${request.nextUrl.pathname}: ${err instanceof Error ? err.message : err}`
    );
    if (requiresAuth(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }
}

async function refreshSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      `Supabase is not configured on this deployment (missing ${!url ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"})`
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove: this revalidates the session with Supabase's servers
  // (getSession() only reads the local cookie and can't be trusted here).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && requiresAuth(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
