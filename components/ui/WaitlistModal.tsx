"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { joinWaitlist } from "@/app/waitlist-actions";
import Button from "./Button";
import Logo from "./Logo";
import { cn } from "./cn";

/**
 * The waitlist, as a dialog.
 *
 * The inline blocks on the marketing pages stay: they carry the argument for
 * joining, and a form in the page is what a search engine and a linked
 * /waitlist page need. This is for the other case, where somebody has already
 * decided and should not have to go looking. One click, one field, done, and
 * they are returned to exactly where they were.
 *
 * Not a <dialog>: Safari's support for the top layer with a custom backdrop is
 * still uneven, and everything the element gives us here is a dozen lines.
 */
export function WaitlistModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputId = useId();
  const titleId = useId();

  // Escape closes, and Tab cycles inside the panel rather than wandering into
  // the page behind it.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Lock the page behind the dialog, and put the caret where it is needed.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A fresh dialog should not still be showing the last answer.
  useEffect(() => {
    if (open) return;
    const id = window.setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setEmail("");
    }, 300);
    return () => window.clearTimeout(id);
  }, [open]);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = email.trim();
      if (!value || status === "busy") return;

      setStatus("busy");
      setMessage("");
      try {
        const result = await joinWaitlist(value);
        if (result.ok) {
          setStatus("done");
        } else {
          setStatus("error");
          setMessage(result.message);
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Try again.");
      }
    },
    [email, status],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      {/* Scrim. A button rather than a div so a pointer-only user can dismiss
          by clicking away, without inventing a click handler on a non-control. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        /* Not --scrim: that token is scheme-scoped, so over the forest hero it
           resolved to a green tint at 55% and the page stayed legible through
           it. A dialog backdrop is global chrome, so it takes a fixed charcoal
           and enough weight to actually recede. */
        className="absolute inset-0 bg-[rgb(26_26_26_/_0.78)] backdrop-blur-[3px] motion-safe:animate-fade"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "scheme-charcoal scheme-paint relative w-full max-w-[26rem] border border-[--rule]",
          "p-8 md:p-10",
          "motion-safe:animate-rise",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center text-[--text-secondary] transition-colors duration-fast hover:text-[--text]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2 L14 14 M14 2 L2 14" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>

        <Logo variant="mark" className="w-8 text-[--text]" />

        {status === "done" ? (
          <>
            <h2 id={titleId} className="t-subheading mt-6 text-[--text]">
              You&rsquo;re on the list
            </h2>
            <p className="mt-4 font-body text-body-s leading-[1.7] text-[--text-secondary]">
              We will write when departures open, and not before. Check your
              inbox for a note confirming it.
            </p>
            <div className="mt-8">
              <Button type="button" variant="secondary" size="md" onClick={onClose} block>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className="t-subheading mt-6 text-[--text]">
              Join the list
            </h2>
            <p className="mt-4 font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Departures open to this list before they go on sale. One email
              when that happens, nothing else.
            </p>

            <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
              <label htmlFor={inputId} className="t-micro text-[--text-secondary]">
                Email address
              </label>
              <input
                id={inputId}
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="you@college.edu"
                autoComplete="email"
                required
                disabled={status === "busy"}
                className={cn(
                  "w-full border-0 border-b border-[--rule-strong] bg-transparent pb-2",
                  "font-body text-body text-[--text] outline-none",
                  "placeholder:text-[--text-muted] disabled:opacity-60",
                )}
              />
              <Button type="submit" variant="primary" size="md" disabled={status === "busy"} block>
                {status === "busy" ? "Sending" : "Join the list"}
              </Button>
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "t-micro min-h-[1.4em]",
                  status === "error" ? "text-[--flag-ink]" : "text-[--text-muted]",
                )}
              >
                {message || " "}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/** Button that opens the dialog, so a caller only renders one thing. */
export default function WaitlistButton({
  label = "Join the list",
  variant = "primary",
  size = "sm",
  className,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Button does not forward a ref, and capturing whatever had focus is more
  // robust anyway: focus goes back exactly where it was rather than to an
  // element we assumed was the trigger.
  const restoreTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    restoreTo.current?.focus();
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          restoreTo.current = e.currentTarget as HTMLElement;
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <WaitlistModal open={open} onClose={close} />
    </>
  );
}
