"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/ui";
import { SPRING_BREAK_DATES_CONFIRMED } from "@/lib/signup-deadline";
import { SPRING_BREAK_LINE, TRIP_LINES } from "@/lib/trip-lines";

/**
 * Decides the nav's opening state from the route.
 *
 * The home page and /waitlist open on a full-bleed photograph, so they want
 * the bar transparent to start with; every other page begins on paper and
 * wants it solid from the first pixel. /telluride and /about joined the first
 * group on 1 October 2026, when their mastheads became full-bleed video. Keeping this here means the layout owns the
 * chrome and no page has to remember to render its own nav.
 */
const PHOTO_HEROES = new Set(["/", "/waitlist", "/telluride", "/about", "/spring-break", "/ambassador"]);
// Empty since 1 October 2026, when /telluride moved to a full-bleed video on
// every screen size. Kept for the next page that needs the phone-only mode.
const PHONE_PHOTO_HEROES = new Set<string>([]);

/**
 * The bar's button, by page (3 November 2026). From a trip's own page "Reserve
 * your spot" opens the booking form on that trip, because whoever pressed it has
 * already chosen. Everywhere else the form asks.
 *
 * /ambassador's bar has no button at all (Carter, 27 October 2026: not "Reserve
 * your spot", and no "Apply" in the bar either); the page's own Apply, full width
 * under the offer, is its one ask. undefined leaves NavBar's default button.
 *
 * Until spring break is on sale its form has nothing to offer, so the bar on
 * /spring-break goes to the page's own list instead.
 */
function ctaFor(pathname: string) {
  if (pathname === "/ambassador") return null;
  const line = TRIP_LINES.find((candidate) => candidate.path === pathname);
  if (!line) return undefined;
  if (line.id === SPRING_BREAK_LINE.id && !SPRING_BREAK_DATES_CONFIRMED) {
    return { label: "Join the list", href: `${line.path}#join` };
  }
  return { label: "Reserve your spot", href: `/bookings/new?line=${line.id}` };
}

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <NavBar
      overHero={PHOTO_HEROES.has(pathname) || (PHONE_PHOTO_HEROES.has(pathname) && "phone")}
      cta={ctaFor(pathname)}
    />
  );
}
