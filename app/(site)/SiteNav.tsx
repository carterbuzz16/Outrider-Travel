"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/ui";

/**
 * Decides the nav's opening state from the route.
 *
 * Only the home page opens on a full-bleed photograph, so only it wants the bar
 * transparent to start with; every interior page begins on paper and wants it
 * solid from the first pixel. Keeping this here means the layout owns the
 * chrome and no page has to remember to render its own nav.
 */
export default function SiteNav() {
  const pathname = usePathname();
  return <NavBar overHero={pathname === "/"} />;
}
