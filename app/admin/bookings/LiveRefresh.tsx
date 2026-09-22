"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the bookings list current without a socket.
 *
 * Every 30 seconds, while the tab is visible, it asks the server to render
 * the page again (router.refresh keeps the scroll position and the filters,
 * since they are in the URL). A hidden tab does nothing, so a laptop left open
 * on the list overnight is not polling the database; coming back to the tab
 * refreshes at once if the last render is stale.
 *
 * `renderedAt` is when the server rendered the rows on screen. It changes on
 * every refresh, which is what resets the "Updated" label.
 */
const INTERVAL_MS = 30_000;

export default function LiveRefresh({ renderedAt }: { renderedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Null until mounted, so the server and the first client render agree.
  const [now, setNow] = useState<number | null>(null);
  const renderedMs = new Date(renderedAt).getTime();

  useEffect(() => {
    const refresh = () => startTransition(() => router.refresh());

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
    };

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, INTERVAL_MS);
    const clock = window.setInterval(tick, 5_000);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      if (Date.now() - renderedMs >= INTERVAL_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    tick();

    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, renderedMs]);

  const label = pending ? "Updating…" : updatedLabel(now === null ? 0 : now - renderedMs);

  return (
    <span className="inline-flex items-center gap-2 t-micro text-[--text-secondary]">
      {/* A small square in the accent, the same marker the badges use, so
          "live" reads as a status rather than decoration. */}
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 bg-[--accent]" />
      <span>Live, {label}</span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        className="t-micro text-[--text] underline decoration-[--rule-strong] underline-offset-4 transition-colors duration-fast hover:text-[--accent] hover:decoration-[--accent]"
      >
        Refresh
      </button>
    </span>
  );
}

function updatedLabel(ageMs: number): string {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${Math.round(seconds / 5) * 5}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Updated ${minutes}m ago`;
}
