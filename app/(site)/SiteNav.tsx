"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/ui";

/**
 * Decides the nav's opening state from the route.
 *
 * The home page and /waitlist open on a full-bleed photograph, so they want
 * the bar transparent to start with; every other page begins on paper and
 * wants it solid from the first pixel. /telluride is both: its photograph runs
 * under the bar on a phone and sits beside the headline from md, so the bar is
 * transparent on a phone only. Keeping this here means the layout owns the
 * chrome and no page has to remember to render its own nav.
 */
const PHOTO_HEROES = new Set(["/", "/waitlist"]);
const PHONE_PHOTO_HEROES = new Set(["/telluride"]);

export default function SiteNav() {
  const pathname = usePathname();
  return <NavBar overHero={PHOTO_HEROES.has(pathname) || (PHONE_PHOTO_HEROES.has(pathname) && "phone")} />;
}
