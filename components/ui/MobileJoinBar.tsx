"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BOOKINGS_OPEN } from "@/lib/booking-window";
import { WaitlistModal } from "./WaitlistModal";
import { cn } from "./cn";

/**
 * A slim "Join the list" bar along the bottom of a phone screen.
 *
 * On a phone the nav's call to action is folded away inside the menu, so a
 * visitor reading a page on the way to class never sees an ask at all unless
 * they reach an inline block. This keeps one within thumb reach.
 *
 * Restrained on purpose, because a sticky bar is one step from the pop-up this
 * brand avoids: it only appears once the first screen has been scrolled past,
 * it steps aside when the footer (which has its own form) comes into view, it
 * can be dismissed for the rest of the visit, and it is not shown at all on
 * /waitlist or once bookings open.
 */
export default function MobileJoinBar() {
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  if (BOOKINGS_OPEN || pathname === "/waitlist" || dismissed) return null;

  const visible = pastHero && !footerVisible;

  return (
    <>
      <div
        className={cn(
          "scheme-espresso fixed inset-x-0 bottom-0 z-30 border-t border-[--rule] bg-[--surface] text-[--text] md:hidden",
          "pb-[env(safe-area-inset-bottom)] transition-transform duration-[--dur] ease-out",
          visible ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        // Hidden from the tab order and from assistive tech while it is
        // parked off screen.
        aria-hidden={!visible || undefined}
        inert={!visible || undefined}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <p className="t-micro text-[--text-secondary]">First dibs on Telluride</p>
          <div className="flex items-center gap-1">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              className="t-label bg-[--accent-solid] px-4 py-3 text-[--accent-contrast] transition-colors duration-fast hover:bg-[--accent-solid-hover]"
            >
              Join
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="grid h-11 w-11 place-items-center text-[--text-muted] transition-colors duration-fast hover:text-[--text]"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <WaitlistModal open={open} onClose={close} placement="mobile-bar" />
    </>
  );
}
