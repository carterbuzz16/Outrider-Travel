"use client";

import { useId, useState } from "react";
import { joinWaitlist } from "@/app/waitlist-actions";
import Button from "./Button";
import { cn } from "./cn";

/**
 * Email capture for the period before departures go on sale.
 *
 * Inline rather than a modal. A pop-up that interrupts someone before they
 * have read anything is the pattern that makes a site feel cheap, and this
 * brand is selling the opposite of cheap. Placed instead at the two points
 * where somebody has just learned the trips are not bookable yet, which is the
 * moment they actually want to be told when that changes.
 *
 * The submit path is the same server action the coming-soon page has always
 * used: it writes to waitlist_signups, syncs the address to the Resend
 * audience, and notifies the team. Nothing new to configure.
 */
export default function WaitlistCTA({
  heading = "Be first to know",
  body = "Departures open to this list before they go on the site. One email when the dates drop, nothing else.",
  className,
  tone = "dark",
}: {
  heading?: string;
  body?: string;
  className?: string;
  /** `dark` for a full-width band, `light` for a bordered block on paper. */
  tone?: "dark" | "light";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || status === "busy") return;

    setStatus("busy");
    setMessage("");
    try {
      const result = await joinWaitlist(value);
      if (result.ok) {
        setEmail("");
        setStatus("done");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch {
      // The action returns its failures rather than throwing, so reaching here
      // means the request itself never completed.
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  const dark = tone === "dark";

  return (
    <section
      className={cn(
        dark ? "scheme-charcoal scheme-paint" : "border border-[--rule] bg-[--surface-raised]",
        className,
      )}
    >
      <div className={cn(dark ? "shell py-16 md:py-20" : "p-8 md:p-10")}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-16">
          <div>
            <h2 className="t-heading max-w-[16ch] text-[--text]">{heading}</h2>
            <p className="mt-5 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
              {body}
            </p>
          </div>

          {status === "done" ? (
            <p
              role="status"
              className="font-body text-body leading-[1.7] text-[--text]"
            >
              You&rsquo;re on the list. We will write when the dates are live.
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
              <label htmlFor={inputId} className="t-micro text-[--text-secondary]">
                Email address
              </label>

              {/* Field-and-button share one rule from sm up, the way the
                  coming-soon page does it: fewer boxes, and the whole thing
                  reads as one control. Below that there is not room for both on
                  a line, so the field keeps the rule and the button drops under
                  it rather than squeezing the address into 180px. */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 sm:border-b sm:border-[--rule-strong] sm:pb-2">
                <input
                  id={inputId}
                  type="email"
                  name="email"
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
                    "min-w-0 flex-1 bg-transparent p-0 pb-2 font-body text-body",
                    "border-0 border-b border-[--rule-strong] sm:border-b-0 sm:pb-0",
                    "text-[--text] outline-none placeholder:text-[--text-muted]",
                    "disabled:opacity-60",
                  )}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={status === "busy"}
                  className="self-start"
                >
                  {status === "busy" ? "Sending" : "Join the list"}
                </Button>
              </div>

              {/* Reserves its line so submitting does not shift the layout. */}
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "t-micro min-h-[1.4em]",
                  // Burnt orange is the flag colour everywhere, but on charcoal
                  // it measures 4.46:1, which misses AA for 11px text. Cream
                  // carries the error there instead; on paper the flag colour
                  // clears AA comfortably and stays the more legible signal.
                  status === "error"
                    ? dark
                      ? "text-[--text]"
                      : "text-[--flag-ink]"
                    : "text-[--text-muted]",
                )}
              >
                {message || " "}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
