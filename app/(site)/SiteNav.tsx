"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/ui";

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

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <NavBar
      overHero={PHOTO_HEROES.has(pathname) || (PHONE_PHOTO_HEROES.has(pathname) && "phone")}
      // /ambassador's bar has no button at all (Carter, 27 October 2026: not
      // "Reserve your spot", and no "Apply" in the bar either); the page's own
      // Apply, full width under the offer, is its one ask. undefined leaves
      // NavBar's default button on every other page.
      cta={pathname === "/ambassador" ? null : undefined}
    />
  );
}
