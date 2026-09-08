import { cn } from "./cn";

/**
 * Status badge — the ticket-stub/rubber-stamp label that sits on a trip card.
 *
 * Deliberately tiny and typographic: tracked-out mono in a hairline box, with
 * a single square marker where a rubber stamp would have its ink. Burnt orange
 * appears on exactly one status ("few spots left"), which is the whole reason
 * that colour exists in the palette — if it starts showing up anywhere else it
 * stops meaning "act now".
 */

export type BadgeTone = "neutral" | "open" | "urgent" | "closed" | "new";

const TONES: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: {
    box: "bg-transparent border-[--rule-strong] text-[--text-secondary]",
    dot: "bg-[--text-muted]",
  },
  open: {
    box: "bg-transparent border-[--accent] text-[--accent]",
    dot: "bg-[--accent]",
  },
  // The one sanctioned use of burnt orange. The rule and the marker keep the
  // full brand value (3.6:1 — fine for a 1px border and a 4px square); the
  // label drops to --flag-ink so it's actually readable.
  urgent: {
    box: "bg-transparent border-[--flag] text-[--flag-ink]",
    dot: "bg-[--flag]",
  },
  closed: {
    box: "bg-transparent border-[--rule] text-[--text-muted]",
    dot: "bg-[--text-muted] opacity-50",
  },
  // The only filled badge, and deliberately so: sky is a dark-scheme colour
  // (1.9:1 on paper), so an outlined sky badge would be unreadable on the very
  // surface trip cards use. Inverting it keeps "just announced" the loudest
  // status on the page and accessible on every scheme.
  new: {
    box: "border-[--accent-solid] bg-[--accent-solid] text-[--accent-contrast]",
    dot: "bg-[--accent-contrast]",
  },
};

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** Drops the marker square — for badges used as plain metadata chips. */
  plain?: boolean;
  className?: string;
};

export default function Badge({
  children,
  tone = "neutral",
  plain = false,
  className,
}: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        // No background in the base: `bg-transparent` here would win over a
        // tone's own `bg-*` on source order, which is what silently flattened
        // the filled variant. Each tone declares its own ground instead.
        "inline-flex items-center gap-2 border px-2.5 py-1.5",
        "stamp-type align-middle",
        t.box,
        className,
      )}
    >
      {!plain && <span aria-hidden="true" className={cn("h-1 w-1", t.dot)} />}
      {children}
    </span>
  );
}

/**
 * The named statuses, so copy stays consistent across every trip listing
 * rather than drifting into "Almost full!" on one page and "2 left" on another.
 */
export const TRIP_STATUS = {
  open: { tone: "open" as const, label: "Spots available" },
  few: { tone: "urgent" as const, label: "Going quickly" },
  soldOut: { tone: "closed" as const, label: "Sold out" },
  waitlist: { tone: "neutral" as const, label: "Waitlist" },
  announced: { tone: "new" as const, label: "Just announced" },
};

export type TripStatus = keyof typeof TRIP_STATUS;

/** Convenience wrapper so a card only has to pass `status="few"`. */
export function StatusBadge({
  status,
  className,
}: {
  status: TripStatus;
  className?: string;
}) {
  const { tone, label } = TRIP_STATUS[status];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
