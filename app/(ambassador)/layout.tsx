import type { Metadata, Viewport } from "next";
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
 * Built for the phone first (Carter: about 90% open it on one). The page runs
 * edge to edge (viewportFit cover) so the tab bar can sit on the home
 * indicator's safe area rather than above a gap; every edge that touches the
 * screen's border pads by the safe-area inset. The browser's own bar takes
 * the page's color, and the portal can be added to the home screen, where it
 * opens full screen like an app (./ambassador/app.webmanifest).
 *
 * Never indexed, never cached: everything under it is one person's.
 */
export const metadata: Metadata = {
  title: { default: "Ambassador", template: "%s | Outrider" },
  robots: { index: false, follow: false },
  manifest: "/ambassador/app.webmanifest",
  appleWebApp: { capable: true, title: "Outrider", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efea" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2320" },
  ],
};

export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-quiet scheme-auto scheme-paint flex min-h-[100dvh] flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="pt-[env(safe-area-inset-top)]">
        <nav className="shell flex min-h-14 items-center justify-between gap-4 md:min-h-20" aria-label="Ambassador">
          <Link href="/" className="no-underline" aria-label="Outrider, home">
            <Logo variant="inline" className="text-[--text]" />
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="min-h-11">
              Log out
            </Button>
          </form>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
