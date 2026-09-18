"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { cn } from "./cn";
import { BOOKINGS_OPEN } from "@/lib/booking-window";

/**
 * What somebody sees the moment they are on the list.
 *
 * The confirmation used to be one sentence and a dead end, at exactly the
 * point the visitor is most convinced. Trips are booked by friends in groups,
 * so the most useful next step is not another page, it is the group chat: one
 * button copies (or, on a phone, shares) a link to /waitlist tagged so the
 * signups it produces show up as referrals.
 */
export default function WaitlistShare({
  heading = "You’re on the list",
  body = BOOKINGS_OPEN
    ? "We'll write when the next trip opens, before it reaches the site. A note confirming it is on its way to your inbox."
    : "We'll write when trips open, before they reach the site. A note confirming it is on its way to your inbox.",
  compact = false,
  className,
  headingId,
  children,
}: {
  heading?: string;
  body?: string;
  /** Tighter type for the dialog and the footer. */
  compact?: boolean;
  className?: string;
  /** So a dialog can name itself after the confirmation. */
  headingId?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // navigator.share only exists client side and mostly on phones, so the
  // label is decided after mount rather than guessed at render.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function share() {
    const url = `${window.location.origin}/waitlist?utm_source=share&utm_medium=referral`;
    // Before launch the pitch is getting in ahead of the sale; after it,
    // there is no "before" left for Telluride, so it points at the next trip.
    const text = BOOKINGS_OPEN
      ? "Outrider opens its trips to this list first. Get on it for the next one."
      : "Outrider opens its trips to this list first. Get on it before booking opens.";

    if (canShare) {
      try {
        await navigator.share({ title: "Outrider", text, url });
        track("Waitlist share", { method: "native" });
        return;
      } catch (err) {
        // Dismissing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("Waitlist share", { method: "copy" });
    } catch {
      // Clipboard access can be refused outright; fall back to selecting a
      // prompt the reader can copy from by hand.
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className={cn("flex flex-col items-start", className)}>
      {/* A seal inking in: the ring draws, then the tick. Pure CSS, so it
          simply appears for anyone who has asked for less motion. */}
      <svg
        viewBox="0 0 48 48"
        className={cn("text-[--accent]", compact ? "h-10 w-10" : "h-12 w-12")}
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="waitlist-seal-ring"
        />
        <path
          d="M15 24.5 L21.5 31 L33 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          className="waitlist-seal-tick"
        />
      </svg>

      {/* Only the news is announced, not the buttons after it. */}
      <div role="status">
        <p
          id={headingId}
          className={cn(
            "mt-5 font-display font-medium tracking-title text-[--text]",
            compact ? "text-display-s" : "text-display-m leading-[1.1]",
          )}
        >
          {heading}
        </p>
        <p
          className={cn(
            "mt-3 max-w-measure font-body leading-[1.7] text-[--text-secondary]",
            compact ? "text-body-s" : "text-body",
          )}
        >
          {body}
        </p>
      </div>

      <div className={cn("w-full border-t border-[--rule]", compact ? "mt-6 pt-5" : "mt-8 pt-6")}>
        <p className="t-micro text-[--text-muted]">Going with friends?</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={share}
            className={cn(
              "inline-flex items-center gap-2.5 border border-[--rule-strong] px-5 py-3",
              "t-label text-[--text] transition-colors duration-fast",
              "hover:border-[--text] hover:bg-[--text] hover:text-[--surface]",
            )}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              {canShare ? (
                <path d="M8 1v9M4.5 4.5 8 1l3.5 3.5M2.5 8.5v6h11v-6" fill="none" stroke="currentColor" strokeWidth="1.25" />
              ) : (
                <path d="M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3" fill="none" stroke="currentColor" strokeWidth="1.25" />
              )}
            </svg>
            {copied ? "Link copied" : canShare ? "Send them the link" : "Copy the link"}
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
