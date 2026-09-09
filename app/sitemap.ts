import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/site-url";
import { getPublishedTrips } from "@/lib/trips";
import { TRIP_DETAILS_OPEN } from "@/lib/booking-window";

/*
 * Static marketing pages plus one entry per published trip. Draft trips are
 * excluded for free: getPublishedTrips only ever returns published ones.
 *
 * Revalidated on the same cadence as the trip pages, so publishing a departure
 * in the admin puts it in the sitemap without a redeploy.
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/trips`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/destinations`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/team`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/assumption-of-risk`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // No point advertising URLs that 404 until launch.
  if (!TRIP_DETAILS_OPEN) return staticRoutes;

  let tripRoutes: MetadataRoute.Sitemap = [];
  try {
    const trips = await getPublishedTrips();
    tripRoutes = trips.map((trip) => ({
      url: `${base}/trips/${trip.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    // A sitemap missing its trip entries is far better than a 500 that makes
    // search engines drop the whole file.
    console.error("Sitemap: failed to load published trips.", err);
  }

  return [...staticRoutes, ...tripRoutes];
}
