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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
