"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FOUNDER } from "@/lib/site-content";

/* ===========================================================================
 * BRAND
 *
 * Every typeface and colour in this file resolves through one of these six
 * custom properties. Swap a value here and the whole page follows; nothing
 * below hardcodes a font or a colour.
 *
 * --font-dm-mono and --font-source-serif are put on <html> by next/font in
 * app/layout.tsx, so the display and body faces stay self-hosted rather than
 * being fetched again here.
 * ========================================================================= */
const BRAND = `
.otr {
  --brand-display: var(--font-dm-mono), ui-monospace, "SFMono-Regular", monospace;
  --brand-body: var(--font-source-serif), "Iowan Old Style", Georgia, serif;
  --brand-bg: #FAF6EF;
  --brand-ink: #1A1A1A;
  --brand-accent: #37646E;
  --brand-rule: rgba(26, 26, 26, 0.15);

  /* Asymmetric left edge. Everything on the page hangs off this one value:
     24px on a phone, 6% on a tablet, 16% on a desktop. The right side is
     left empty on purpose. */
  --gutter: 24px;
}
@media (min-width: 768px)  { .otr { --gutter: 6%; } }
@media (min-width: 1024px) { .otr { --gutter: 16%; } }

/* Menu items fade up and in, 60ms apart. The delay is set per item inline. */
@keyframes otr-rise {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.otr-item { animation: otr-rise 420ms cubic-bezier(0.65, 0, 0.35, 1) both; }

/* The panel is driven by a class rather than a Tailwind variant so the closed
   state can keep its transform while it slides back out. */
.otr-panel {
  transform: translateX(100%);
  transition: transform 450ms cubic-bezier(0.65, 0, 0.35, 1);
}
.otr-panel[data-open="true"] { transform: translateX(0); }

@media (prefers-reduced-motion: reduce) {
  /* No slide, no stagger. The panel and its items simply appear. */
  .otr-panel { transform: none; opacity: 0; visibility: hidden;
               transition: opacity 200ms linear, visibility 200ms linear; }
  .otr-panel[data-open="true"] { opacity: 1; visibility: visible; }
  .otr-item { animation: none; }
  .otr-x { transition: none; }
}
`;

const MENU = ["Trips", "Destinations", "About", "FAQ", "Contact"];

/* One person, read from lib/site-content so his name, role, portrait and bio
 * have a single home. The brief asked for a single self-contained file; this is
 * the one import worth breaking that for, because the alternative is a second
 * copy of the bio that quietly disagrees with the About page after the next
 * edit. */
const TEAM = [FOUNDER];

export default function TeamPage() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Escape closes, and Tab cycles inside the panel rather than escaping to the
  // page behind it.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Lock the page behind the panel, and put focus where the user is looking.
  // Restoring the previous overflow rather than clearing it means this does not
  // fight anything else that may have set it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstLink = panelRef.current?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();

    return () => {
      document.body.style.overflow = previous;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="otr min-h-screen bg-[color:var(--brand-bg)] text-[color:var(--brand-ink)]">
      <style>{BRAND}</style>

      {/* ---- trigger ------------------------------------------------------ */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="otr-nav"
        className="fixed right-6 top-6 z-30 font-[family-name:var(--brand-display)] text-[13px] uppercase tracking-[0.2em] text-[color:var(--brand-ink)] md:right-10 md:top-10"
      >
        Menu
      </button>

      {/* ---- team page ---------------------------------------------------- */}
      <main className="pb-[120px]" style={{ paddingLeft: "var(--gutter)", paddingRight: "24px" }}>
        <h1
          className="m-0 max-w-[14ch] font-[family-name:var(--brand-display)] leading-[0.95] tracking-[-0.03em]"
          style={{ fontSize: "clamp(56px, 8vw, 140px)", paddingTop: "80px", marginBottom: "64px" }}
        >
          Outrider Team
        </h1>

        {/* Sits in the left 40% and stops at 46ch, whichever is narrower. */}
        <p
          className="m-0 font-[family-name:var(--brand-body)] text-[17px] leading-[1.6]"
          style={{ maxWidth: "min(46ch, 40vw)", marginBottom: "120px" }}
        >
          Outrider is run by the person who used to be on the other end of it:
          booking the rooms, moving the group, and answering for it when
          something went wrong. That is the whole reason it works the way it
          does.
        </p>

        <ul className="m-0 flex list-none flex-col gap-[120px] p-0">
          {TEAM.map((person) => (
            <li key={person.name}>
              <article className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] md:items-start md:gap-16">
                {person.portrait ? (
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={person.portrait.src}
                      alt={person.portrait.alt}
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : null}

                <div>
                  <h2
                    className="m-0 font-[family-name:var(--brand-display)] leading-[1] tracking-[-0.02em]"
                    style={{ fontSize: "clamp(40px, 5vw, 84px)" }}
                  >
                    {person.name}
                  </h2>
                  <p className="mb-8 mt-4 font-[family-name:var(--brand-display)] text-[13px] uppercase tracking-[0.2em] opacity-70">
                    {person.role}
                  </p>

                  {person.pullQuote ? (
                    <blockquote
                      className="m-0 mb-10 max-w-[34ch] border-l border-[color:var(--brand-rule)] pl-6 font-[family-name:var(--brand-display)] leading-[1.35]"
                      style={{ fontSize: "clamp(20px, 2.2vw, 30px)" }}
                    >
                      &ldquo;{person.pullQuote}&rdquo;
                    </blockquote>
                  ) : null}

                  <div className="flex flex-col gap-6">
                    {person.bio.map((paragraph, i) => (
                      <p
                        key={i}
                        className="m-0 max-w-[60ch] font-[family-name:var(--brand-body)] text-[17px] leading-[1.6]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>

      {/* ---- navigation overlay -------------------------------------------
          Kept mounted so the panel can slide back out rather than vanishing.
          `inert` is what actually takes the closed panel out of the tab order
          and away from screen readers. */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={close}
        className="fixed inset-y-0 left-0 z-40 w-[4%]"
        style={{ display: open ? "block" : "none" }}
      />

      <div
        id="otr-nav"
        ref={panelRef}
        className="otr-panel fixed inset-y-0 right-0 z-50 left-[4%] bg-[color:var(--brand-accent)]"
        data-open={open}
        // React 19 takes `inert` as a real boolean. It is what removes the
        // closed panel from the tab order and from the accessibility tree,
        // so aria-hidden is not needed alongside it.
        inert={!open}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="otr-x absolute transition-transform duration-[250ms] hover:rotate-90"
          style={{ top: "44px", right: "44px" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <path
              d="M4 4 L24 24 M24 4 L4 24"
              stroke="var(--brand-bg)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </button>

        <nav
          aria-label="Primary"
          style={{ paddingTop: "8%", paddingLeft: "14%", paddingRight: "24px" }}
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {MENU.map((item, i) => (
              <li key={item} className={open ? "otr-item" : undefined} style={{ animationDelay: `${i * 60}ms` }}>
                <a
                  href="#"
                  onClick={close}
                  className="block font-[family-name:var(--brand-display)] leading-[1.55] text-[color:var(--brand-bg)] no-underline opacity-100 transition-opacity duration-200 hover:opacity-[0.65]"
                  style={{ fontSize: "clamp(40px, 6vw, 84px)" }}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
