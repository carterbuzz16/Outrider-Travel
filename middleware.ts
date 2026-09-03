import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // "/" is the static coming-soon page: it has no session to refresh, and
    // running updateSession there would put a Supabase round-trip in front of
    // every visit to the one page most people will ever see.
    "/((?!_next/static|_next/image|favicon.ico|$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
