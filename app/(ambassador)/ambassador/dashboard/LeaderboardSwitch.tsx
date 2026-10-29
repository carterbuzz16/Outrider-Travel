"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/components/ui";
import { AMBASSADOR_PORTAL as COPY } from "@/lib/site-content";
import { setLeaderboardVisibility } from "./actions";

/**
 * Show my name on the leaderboard: a real on/off switch (Carter, 29 Oct
 * 2026: "a toggle and not just a click"). On by default. It moves the moment
 * it is tapped and saves behind that; if the save fails, for any reason, it
 * moves back and says so. Turned off, the ambassador still has a rank, and everyone else
 * sees them as "An ambassador". It can be turned back on any time.
 */
export default function LeaderboardSwitch({ hidden }: { hidden: boolean }) {
  const [shown, setShown] = useState(!hidden);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The dashboard's live refresh is the source of truth once it arrives.
  useEffect(() => {
    if (!pending) setShown(!hidden);
  }, [hidden, pending]);

  function flip() {
    const next = !shown;
    setShown(next);
    setError(null);
    startTransition(async () => {
      // A refusal comes back as a result; a dropped connection or a server
      // fault throws. Either way the switch goes back to what is saved.
      try {
        const result = await setLeaderboardVisibility(!next);
        if (!result.ok) {
          setShown(!next);
          setError(result.message);
        }
      } catch {
        setShown(!next);
        setError("That didn't save. Try again.");
      }
    });
  }

  return (
    <div className="bg-[--surface-raised] px-4 py-4">
      {/* The whole row flips it: a label activates the button it names. */}
      <div className="flex min-h-11 items-center justify-between gap-4">
        <label htmlFor="leaderboard-switch" className="cursor-pointer font-body text-body text-[--text]">
          {COPY.leaderboardShow}
        </label>
        <button
          id="leaderboard-switch"
          type="button"
          role="switch"
          aria-checked={shown}
          onClick={flip}
          className={cn(
            "relative inline-flex h-9 w-[3.75rem] shrink-0 items-center transition-colors duration-fast",
            shown ? "bg-[--accent-solid]" : "bg-[--surface-inset]",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-1 h-7 w-7 bg-[--surface] transition-transform duration-fast",
              shown ? "translate-x-7" : "translate-x-0",
            )}
          />
        </button>
      </div>
      <p className="mt-2 font-body text-body-s text-[--text-secondary]" aria-live="polite">
        {error ?? (shown ? COPY.leaderboardShownNote : COPY.leaderboardHiddenNote)}
      </p>
    </div>
  );
}
