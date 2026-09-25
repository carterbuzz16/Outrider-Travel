import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import {
  EARLY_ACCESS_COOKIE,
  EARLY_ACCESS_COOKIE_MAX_AGE,
  findEarlyAccessMember,
} from "@/lib/early-access";

/*
 * /early-access?t=<token>: the button in the list's head-start email.
 *
 * A route handler rather than a page because it has to set a cookie, which a
 * server component cannot. A good token stores itself in an httpOnly cookie
 * and goes on to /bookings/new (middleware sends a signed-out visitor through
 * /login and back). A bad or lapsed one goes to the same page with
 * ?error=early_access, which says so in words.
 *
 * Public and unauthenticated, so rate-limited per IP like the other public
 * endpoints. A uuid cannot be guessed at any rate; this is about not letting
 * the endpoint be used to hammer the database.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const bookings = new URL("/bookings/new", request.url);

  const allowed = await checkRateLimit(`early-access:${await clientIp()}`, 30, 60 * 60);
  const member = allowed ? await findEarlyAccessMember(token) : null;

  if (!member) {
    bookings.searchParams.set("error", "early_access");
    return NextResponse.redirect(bookings);
  }

  const response = NextResponse.redirect(bookings);
  response.cookies.set(EARLY_ACCESS_COOKIE, token.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EARLY_ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
