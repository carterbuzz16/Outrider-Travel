import type { Metadata } from "next";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { logout } from "@/app/auth/actions";

/*
 * The ambassador portal's shell (/ambassador/dashboard, 29 October 2026).
 * Its own route group, so it has none of the marketing chrome (the Reserve
 * bar, the footer, the cookie notice) and none of the booking flow's: a logo
 * home and a way out. .scheme-auto follows the phone's light or dark setting;
 * .site-quiet keeps the public site's no-hairlines rule, since ambassadors
 * are the brand's own audience.
 *
 * Never indexed, never cached: everything under it is one person's.
 */
export const metadata: Metadata = {
  title: { default: "Ambassador", template: "%s | Outrider" },
  robots: { index: false, follow: false },
};

export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-quiet scheme-auto scheme-paint flex min-h-screen flex-col">
      <header>
        <nav className="shell flex min-h-16 items-center justify-between gap-4 py-3 md:min-h-20" aria-label="Ambassador">
          <Link href="/" className="no-underline" aria-label="Outrider, home">
            <Logo variant="inline" className="text-[--text]" />
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
