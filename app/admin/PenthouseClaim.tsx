import { claimFromRows, penthouseFill, type ClaimRow } from "@/lib/penthouse";

/**
 * One penthouse's claim, for the admin: who holds it (the group code, shown
 * here and nowhere public), how many of the group have paid, the 7-day fill
 * deadline, and a flag once that deadline has passed with beds still empty.
 *
 * Read-only. Nothing here emails anyone or changes a booking or a balance;
 * what happens to empty beds is for the team to decide (see PENTHOUSE_DISCLAIMER).
 */

export type PenthouseTierRows = {
  max_capacity: number | null;
  bookings: ClaimRow[];
};

/** Deadline in Mountain time, the trip's zone, with the zone printed. */
function formatDeadline(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function penthouseStatus(tier: PenthouseTierRows, now: Date = new Date()) {
  const claim = claimFromRows(tier.bookings, now);
  const capacity = tier.max_capacity;
  const fill = claim?.code && capacity !== null ? penthouseFill(tier.bookings, claim.code, capacity, now) : null;
  return { claim, fill, capacity };
}

export default function PenthouseClaim({ tier, now }: { tier: PenthouseTierRows; now?: Date }) {
  const { claim, fill, capacity } = penthouseStatus(tier, now);

  if (!claim) {
    return <span className="font-body text-body-s text-[--text-secondary]">Unclaimed</span>;
  }

  return (
    <span className="flex flex-col gap-1 font-body text-body-s">
      <span className="text-[--text]">
        Claimed by group <span className="tracking-label">{claim.code ?? "(no code)"}</span>
      </span>
      {fill && (
        <span className="tabular-nums text-[--text-secondary]">
          {fill.filled} of {capacity} booked
          {fill.deadline && fill.state !== "full" && <> · fill by {formatDeadline(fill.deadline)}</>}
          {fill.state === "waiting" && " · clock starts at the first payment"}
        </span>
      )}
      {fill?.state === "expired" && (
        <span className="t-micro text-[--flag-ink]">Unfilled past deadline</span>
      )}
      {claim.others > 0 && (
        <span className="t-micro text-[--flag-ink]">
          {claim.others} active booking{claim.others === 1 ? "" : "s"} under another code
        </span>
      )}
    </span>
  );
}
