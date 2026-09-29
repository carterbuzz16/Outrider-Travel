"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pixelPageView } from "@/lib/meta-pixel";

/**
 * Sends the Meta Pixel a page view on first load and on every client-side
 * navigation, subject to the rules in lib/meta-pixel.ts (live site only, no
 * credential in the URL, opt-outs honored, off in Europe).
 *
 * Keyed to the pathname only. A change of query string alone (a filter, a
 * form step) is not a new page to an ad audience, and useSearchParams would
 * push every page under the root layout into a Suspense boundary for it.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    pixelPageView();
  }, [pathname]);
  return null;
}
