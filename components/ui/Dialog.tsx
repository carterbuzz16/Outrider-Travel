"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "./cn";

/**
 * A modal panel over the page, for a decision that should not be made by
 * accident.
 *
 * The same mechanics as WaitlistModal (scrim, Escape, Tab kept inside the
 * panel, the page locked behind it), lifted out so a second dialog does not
 * copy them a third time. Like that one it is not a <dialog>: Safari's top
 * layer with a custom backdrop is still uneven, and what the element would
 * give us is a dozen lines here.
 *
 * Focus goes to the first element inside the panel marked `data-autofocus`,
 * falling back to the first focusable one. A confirmation should mark its
 * safe choice, so that a stray Enter keeps things as they are. The caller owns
 * returning focus on close, because only the caller knows what opened it.
 *
 * `locked` holds the dialog open while something it started is still running:
 * Escape and the scrim stop dismissing it, so nobody walks away from a
 * half-finished action believing it was abandoned.
 *
 * Two options for an offer rather than a confirmation (the new-account credit,
 * components/WelcomeCredit.tsx): `band` sets the title in a club blue band
 * across the top, with an eyebrow over it and a close button in its corner,
 * and `sheet` rises from the bottom edge on a phone, where a thumb can reach
 * it, and sits centred from sm up.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  role = "dialog",
  locked = false,
  band,
  sheet = false,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Read out with the title when the dialog opens. */
  description?: React.ReactNode;
  /** `alertdialog` for a confirmation that interrupts, per WAI-ARIA. */
  role?: "dialog" | "alertdialog";
  locked?: boolean;
  /** Title in a club blue band, with a small label over it and a close button. */
  band?: { eyebrow?: React.ReactNode };
  /** Anchored to the bottom edge on a phone. */
  sheet?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!locked) onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Focus that has somehow left the panel is brought back in, rather than
      // left to wander the page behind the scrim.
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, locked]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])");
    target?.focus();

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex justify-center",
        sheet ? "items-end sm:items-center sm:p-5" : "items-center p-4 sm:p-5",
      )}
    >
      {/* Scrim. A button so a pointer-only user can dismiss by clicking away;
          kept out of the tab order because Escape and the panel's own buttons
          already do the job for everyone else. The fixed deep espresso is the
          same one WaitlistModal uses, for the same reason: a backdrop is
          global chrome, not something the section behind it should tint. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => {
          if (!locked) onClose();
        }}
        className="absolute inset-0 bg-[rgb(42_35_32_/_0.8)] backdrop-blur-[3px] motion-safe:animate-fade"
      />

      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "scheme-light scheme-paint relative w-full max-w-[30rem] border border-[--rule]",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 md:p-9",
          sheet && "max-h-[92dvh] border-x-0 border-b-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-2rem)] sm:border-x sm:border-b sm:pb-8 md:pb-9",
          "motion-safe:animate-rise",
          className,
        )}
      >
        {band ? (
          // Edge to edge: the band undoes the panel's padding, then puts its own back.
          <div className="scheme-club scheme-paint relative -mx-6 -mt-6 px-6 pb-7 pt-6 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-7 md:-mx-9 md:-mt-9 md:px-9">
            {band.eyebrow && <p className="t-micro pr-12 text-[--text]">{band.eyebrow}</p>}
            <h2 id={titleId} className={cn("pr-10 text-[--text]", Boolean(band.eyebrow) && "mt-4")}>
              {title}
            </h2>
            {!locked && (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-[--text] transition-opacity duration-fast hover:opacity-70 sm:right-3 sm:top-3"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <h2 id={titleId} className="t-subheading text-[--text]">
            {title}
          </h2>
        )}
        {description && (
          <div
            id={descriptionId}
            className="mt-4 font-body text-body-s leading-[1.7] text-[--text-secondary]"
          >
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
