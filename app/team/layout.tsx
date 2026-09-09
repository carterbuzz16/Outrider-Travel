import type { Metadata } from "next";

/*
 * /team is not finished: the bios are placeholder and nothing links to it.
 * Keeping it reachable by URL is useful for review, but it must not be found
 * in search in that state, and a page with placeholder copy ranking for the
 * brand's own name is the specific thing to avoid.
 *
 * The page is a client component and so cannot export metadata itself. This
 * layout is a server component and only wraps it. Remove the robots line when
 * the real copy is in.
 */
export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
