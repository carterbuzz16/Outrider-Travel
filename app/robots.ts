import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/site-url";

/*
 * Everything a signed-in person sees is disallowed. Not because it is secret
 * (it is all behind auth anyway) but because a crawler following those URLs
 * only ever reaches a login redirect, which wastes crawl budget and can get the
 * login page itself indexed in place of the real content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/bookings",
        "/auth",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/style",
        "/api",
      ],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
