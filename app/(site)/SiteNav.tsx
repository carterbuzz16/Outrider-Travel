"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/ui";

/**
 * Decides the nav's opening state from the route.
 *
 * The home page, /waitlist and /telluride open on a full-bleed photograph, so
 * they want the bar transparent to start with; every other page begins on
 * paper and wants it solid from the first pixel. Keeping this here means the layout owns the
 * chrome and no page has to remember to render its own nav.
 */
const PHOTO_HEROES = new Set(["/", "/waitlist", "/telluride"]);

export default function SiteNav() {
  const pathname = usePathname();
  return <NavBar overHero={PHOTO_HEROES.has(pathname)} />;
}
