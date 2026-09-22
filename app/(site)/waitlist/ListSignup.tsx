"use client";

import { useId } from "react";
import { Button, cn } from "@/components/ui";
import WaitlistShare from "@/components/ui/WaitlistShare";
import { useWaitlistSignup } from "@/components/ui/useWaitlistSignup";

/**
 * The big form: the hero's and the close's.
 *
 * Larger than the inline block elsewhere on the site because on this page it is
 * the whole point, and it sits on a photograph, so the field is a single strong
 * rule rather than a box that would fight the picture.
 */
export default function ListSignup({
  placement,
  className,
}: {
  placement: string;
  className?: string;
}) {
  const { email, setEmail, status, message, submit } = useWaitlistSignup(placement);
  const inputId = useId();
  const noteId = useId();

  if (status === "done") {
    return <WaitlistShare className={cn("motion-safe:animate-rise", className)} />;
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full max-w-[34rem]", className)}>
      <label htmlFor={inputId} className="t-micro text-[--text-secondary]">
        Email address
      </label>
      <div
        className={cn(
          "mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3",
          "sm:border-b sm:border-[--rule-strong] sm:pb-3",
          "transition-colors duration-fast focus-within:border-[--text]",
        )}
      >
        <input
          id={inputId}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@college.edu"
          autoComplete="email"
          inputMode="email"
          required
          aria-describedby={noteId}
          aria-invalid={status === "error" || undefined}
          disabled={status === "busy"}
          className={cn(
            "min-w-0 flex-1 bg-transparent p-0 pb-3 font-body text-lede text-[--text]",
            "border-0 border-b border-[--rule-strong] sm:border-b-0 sm:pb-0",
            "outline-none placeholder:text-[--text-muted] disabled:opacity-60",
          )}
        />
        <Button type="submit" variant="primary" size="lg" disabled={status === "busy"} className="sm:self-auto">
          {status === "busy" ? "Sending" : "Join the list"}
          <svg viewBox="0 0 16 10" className="w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M0 5h14M10 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.25" />
          </svg>
        </Button>
      </div>

      <p
        id={noteId}
        role="status"
        aria-live="polite"
        className={cn(
          "t-micro mt-4 min-h-[1.4em]",
          // Clay is marginal at this size on espresso, so the error is
          // carried in full-strength paper there, as in WaitlistCTA.
          status === "error" ? "text-[--text]" : "text-[--text-muted]",
        )}
      >
        {status === "error" ? message : "Free, no commitment, one-click unsubscribe"}
      </p>
    </form>
  );
}
