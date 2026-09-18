"use client";

import { useId } from "react";
import { usePathname } from "next/navigation";
import Button from "./Button";
import WaitlistShare from "./WaitlistShare";
import { cn } from "./cn";
import { useWaitlistSignup } from "./useWaitlistSignup";

/**
 * The waitlist, one line tall, at the bottom of every page.
 *
 * The footer is where someone lands after reading a page to the end, which is
 * a better moment to ask than the top of it. Before this it offered "Get in
 * touch", which asks a reader who has not decided anything to write a message.
 *
 * Skipped on /waitlist, where the page's own close sits directly above and a
 * second form would only be the first one again.
 */
export default function FooterSignup() {
  const pathname = usePathname();
  const { email, setEmail, status, message, submit } = useWaitlistSignup("footer");
  const inputId = useId();

  if (pathname === "/waitlist") return null;

  if (status === "done") {
    return <WaitlistShare compact className="max-w-sm motion-safe:animate-rise" />;
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-sm">
      <label htmlFor={inputId} className="t-micro text-[--text]">
        Hear about departures first
      </label>
      <div className="mt-4 flex items-center gap-3 border-b border-[--rule-strong] pb-2 transition-colors duration-fast focus-within:border-[--text]">
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
          disabled={status === "busy"}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 font-body text-body-s text-[--text] outline-none placeholder:text-[--text-muted] disabled:opacity-60"
        />
        <Button type="submit" variant="ghost" size="sm" disabled={status === "busy"}>
          {status === "busy" ? "Sending" : "Join"}
        </Button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn("t-micro mt-3 min-h-[1.4em]", status === "error" ? "text-[--text]" : "text-[--text-muted]")}
      >
        {message || "Hear it first. Leave any time."}
      </p>
    </form>
  );
}
