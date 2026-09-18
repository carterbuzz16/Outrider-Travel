import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

/*
 * The page is a client component and so cannot export metadata itself. This
 * layout is a server component and only wraps it.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Team",
    path: "/team",
    description:
      "Who runs Outrider. Carter Busby, President and Founder, and why the company works the way it does.",
  }),
  // A standalone layout experiment, not linked from the site and out of the
  // sitemap: kept out of search so it never competes with /about.
  robots: { index: false, follow: false },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
