"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import Button from "./Button";
import { cn } from "./cn";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { ACCOUNT_LINK, type NavLink } from "./nav-links";

/**
 * Nav bar — transparent over a hero, solid once you leave it.
 *
 * Over the hero the bar carries no background and inherits the hero's own
 * scheme (`overHero` puts it in `.scheme-forest`, which is what a dark or
 * photographic hero needs). Past 24px of scroll it takes on the paper surface,
 * a hairline underneath, and the light scheme. Both states cross-fade over
 * 260ms; nothing slides or collapses.
 *
 * Pages without a hero pass `overHero={false}` and the bar is simply solid
 * from the top.
 */

export type { NavLink };
export { ACCOUNT_LINK };

// Every entry here has a page behind it. A nav that links to a 404 is worse
// than a short nav, so this grows when the routes do.
export const DEFAULT_LINKS: NavLink[] = [
  { label: "Trips", href: "/trips" },
  { label: "Destinations", href: "/destinations" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export default function NavBar({
  links = DEFAULT_LINKS,
  overHero = true,
  cta = { label: BOOKINGS_OPEN ? "Reserve a spot" : "View trips", href: "/trips" },
  account = ACCOUNT_LINK,
}: {
  links?: NavLink[];
  overHero?: boolean;
  cta?: { label: string; href: string } | null;
  account?: NavLink | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Read once on mount too: a reload partway down a page should not start
    // the bar in its transparent state.
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Lock the page behind the open sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const solid = scrolled || !overHero || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-[--dur] ease-out",
        // text-[--text] is not redundant: a scheme class only redefines the
        // variables, and `color` is inherited from body as an already-resolved
        // value. Sections fix that with .scheme-paint, but the bar must not
        // paint a background in its transparent state — so it re-resolves the
        // color here instead, and anything inside it inherits correctly.
        "text-[--text]",
        solid
          ? "scheme-light border-b border-[--rule] bg-[--surface]"
          : "scheme-charcoal border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="shell flex h-16 items-center justify-between gap-6 md:h-20"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="no-underline"
          aria-label="Outrider, home"
          onClick={() => setOpen(false)}
        >
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <ul className="hidden list-none items-center gap-8 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "t-label -my-2.5 block py-2.5 no-underline transition-colors duration-fast",
                    // Over a photographic hero the links run at full strength:
                    // 58% cream measured 2.7–4.5:1 against the brightest sky in
                    // the picture. On a solid bar there is no such constraint,
                    // so inactive links can sit back at secondary.
                    active
                      ? "text-[--text]"
                      : solid
                        ? "text-[--text-secondary] hover:text-[--text]"
                        : "text-[--text] hover:text-[--accent]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block border-b pb-1",
                      active ? "border-current" : "border-transparent",
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-5 md:gap-6">
          {account && (
            <Link
              href={account.href}
              className={cn(
                "t-label -my-2.5 hidden py-2.5 no-underline transition-colors duration-fast md:block",
                solid
                  ? "text-[--text-secondary] hover:text-[--text]"
                  : "text-[--text] hover:text-[--accent]",
              )}
            >
              {account.label}
            </Link>
          )}

          {cta && (
            <Button href={cta.href} variant="secondary" size="sm" className="hidden md:inline-flex">
              {cta.label}
            </Button>
          )}

          <button
            type="button"
            className="t-label -m-2 p-2 md:hidden"
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {/* Mobile sheet. A full-width paper panel under the bar — no slide-in
          drawer, no scrim animation. */}
      <div
        id="nav-sheet"
        hidden={!open}
        className="scheme-light border-t border-[--rule] bg-[--surface] text-[--text] md:hidden"
      >
        <ul className="shell flex list-none flex-col gap-0 py-2">
          {links.map((link) => (
            <li key={link.href} className="border-b border-[--rule-faint] last:border-0">
              <Link href={link.href} className="t-label block py-4 no-underline text-[--text]">
                {link.label}
              </Link>
            </li>
          ))}
          {account && (
            <li className="border-t border-[--rule] pt-0">
              <Link
                href={account.href}
                className="t-label block py-4 no-underline text-[--text]"
              >
                {account.label}
              </Link>
            </li>
          )}
        </ul>
        {cta && (
          <div className="shell pb-6 pt-2">
            <Button href={cta.href} variant="primary" size="md" block>
              {cta.label}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
