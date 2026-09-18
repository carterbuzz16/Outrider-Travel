import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

/*
 * The trip portal: reached from a signed link in an email, with no login.
 *
 * The token rides in the query string, so everything here is about not letting
 * the URL travel further than it has to:
 *   - noindex/nofollow, in case a link is ever pasted somewhere public;
 *   - referrer "no-referrer", so following any link off the page (including
 *     to our own pages) never sends the tokened URL in a Referer header. The
 *     same policy is also sent as a response header from next.config.mjs,
 *     which covers requests made before this meta tag is parsed;
 *   - the pages are force-dynamic, which Next serves as private, no-store, so
 *     no shared cache keeps a copy of someone's trip page.
 *
 * Deliberately outside the (protected) group, and not in middleware's
 * matcher, so a visitor with no session is never bounced to /login.
 */
export const metadata: Metadata = {
  title: { default: "Your trip", template: "%s · Outrider" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function TripPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="scheme-light scheme-paint flex min-h-screen flex-col">
      <header className="border-b border-[--rule]">
        <div className="shell flex min-h-16 items-center justify-between gap-4 py-3 md:min-h-20">
          <Link href="/" className="no-underline" aria-label="Outrider, home">
            <Logo variant="inline" className="text-[--text]" />
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
