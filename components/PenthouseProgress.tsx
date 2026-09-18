"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import CopyLinkButton from "@/components/CopyLinkButton";
import { PENTHOUSE_FILL_DAYS, readSnapshot, type PenthouseSnapshot } from "@/lib/penthouse";

/**
 * How full a group's penthouse is, and the invite that fills it.
 *
 * Self-contained on purpose: it is dropped into the bookings card, the
 * confirmation page, the trip portal and the joining view at checkout, all of
 * which are being restyled, so it brings its own frame and asks nothing of the
 * page around it.
 *
 * The first figures are rendered on the server (getPenthouseProgress /
 * getClaimSnapshot), so there is no empty flash. While the page is open it
 * asks /api/penthouse-progress again every 30 seconds, skipping while the tab
 * is hidden and catching up the moment it is shown again. That route answers
 * only for the group's own code, so a failed or refused poll simply leaves the
 * last figures up.
 */

const POLL_MS = 30_000;

export default function PenthouseProgress({
  initial,
  renderedAt,
  tierId,
  groupCode,
  invitePath,
  joining,
  className,
}: {
  initial: PenthouseSnapshot;
  /** The server's clock at render, so the first client render matches it. */
  renderedAt: string;
  tierId: string;
  groupCode: string;
  /** From penthouseInvitePath. Omit where sharing makes no sense (the joining view). */
  invitePath?: string;
  /** Set on the checkout page for someone joining with a friend's code: the tier's name. */
  joining?: string;
  className?: string;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [now, setNow] = useState(() => new Date(renderedAt));

  useEffect(() => {
    let cancelled = false;
    const url = `/api/penthouse-progress?tier=${encodeURIComponent(tierId)}&group=${encodeURIComponent(groupCode)}`;

    async function poll() {
      setNow(new Date());
      if (document.hidden) return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as PenthouseSnapshot;
        if (!cancelled) setSnapshot(next);
      } catch {
        // Offline for a moment; the next tick tries again.
      }
    }

    function onVisible() {
      if (!document.hidden) void poll();
    }

    setNow(new Date());
    const id = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tierId, groupCode]);

  const { filled, capacity } = snapshot;
  const { state, daysLeft } = readSnapshot(snapshot, now);
  const pct = capacity > 0 ? Math.min(100, Math.round((filled / capacity) * 100)) : 0;
  const days = `${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
  const open = Math.max(0, capacity - filled);

  let status: string;
  if (joining) {
    const places = `${open} ${open === 1 ? "place" : "places"} left`;
    status =
      state === "full"
        ? `${joining} · all ${capacity} in`
        : `You're joining ${joining} · ${filled} of ${capacity} in · ${places}` +
          (state === "filling" ? ` · ${days} to fill` : "");
  } else {
    status =
      state === "full"
        ? `All ${capacity} in. The penthouse is yours.`
        : state === "expired"
          ? `The ${PENTHOUSE_FILL_DAYS} days are up with ${filled} of ${capacity} in. Our team will be in touch about the empty places.`
          : state === "waiting"
            ? `${filled} of ${capacity} in. Your group has ${PENTHOUSE_FILL_DAYS} days to fill it once the first place is booked.`
            : `${filled} of ${capacity} in · ${days} left to fill`;
  }

  const share = invitePath && (state === "waiting" || state === "filling");

  return (
    <section
      aria-label={joining ? `Joining ${joining}` : "Your penthouse"}
      className={cn("border border-[--rule] bg-[--surface-raised] p-5 sm:p-6", className)}
    >
      <p className="t-micro text-[--text-secondary]">{joining ? "Your friends' penthouse" : "Your penthouse"}</p>
      <p role="status" className="mt-2 font-body text-body text-[--text]">
        {status}
      </p>
      <div aria-hidden="true" className="mt-3 h-1 w-full bg-[--rule]">
        <div className="h-full bg-[--accent-solid] transition-[width] duration-fast" style={{ width: `${pct}%` }} />
      </div>

      {share && (
        <div className="mt-5 flex flex-col gap-3 border-t border-[--rule] pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="font-body text-body-s text-[--text-secondary]">
              Send this to the friends sharing your penthouse
            </p>
            <p className="mt-1 font-display text-display-s font-medium tracking-label text-[--text]">
              {groupCode}
            </p>
          </div>
          <CopyLinkButton path={invitePath} className="shrink-0" />
        </div>
      )}
    </section>
  );
}
