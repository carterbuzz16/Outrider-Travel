"use client";

import { useEffect, useState } from "react";

/*
 * The sticky row of section links under a long page's masthead, so nothing on
 * /telluride is more than one click away.
 *
 * It sticks directly under the fixed site nav (h-16, md:h-20), so the sections
 * it links to need a scroll margin of nav plus this row (see SECTION_SCROLL in
 * the page). The link for the section in view is marked, found with one
 * IntersectionObserver watching a thin band a third of the way down the
 * screen: whichever section crosses that band is the one being read.
 *
 * No button of its own: the site nav above it already carries the one call to
 * action, and two in a stack read as clutter.
 */

export type SectionLink = { href: `#${string}`; label: string };

export default function SectionNav({ links }: { links: SectionLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = links
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-33% 0px -66% 0px" },
    );
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [links]);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-16 z-30 border-b border-[--rule] bg-[--surface] md:top-20"
    >
      <div className="shell flex h-14 items-center">
        <ul className="-mx-gutter m-0 flex h-full list-none items-stretch gap-7 overflow-x-auto px-gutter [scrollbar-width:none] sm:mx-0 sm:px-0 md:gap-10 [&::-webkit-scrollbar]:hidden">
          {links.map((link) => {
            const current = active === link.href.slice(1);
            return (
              <li key={link.href} className="flex shrink-0">
                <a
                  href={link.href}
                  aria-current={current ? "location" : undefined}
                  className={[
                    "t-label flex items-center whitespace-nowrap border-b-2 no-underline transition-colors duration-fast",
                    current
                      ? "border-[--accent] text-[--text]"
                      : "border-transparent text-[--text-secondary] hover:text-[--text]",
                  ].join(" ")}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
