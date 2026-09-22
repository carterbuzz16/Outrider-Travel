import { Badge, cn } from "@/components/ui";
import type { Tasks } from "./booking-rows";

/*
 * Small pieces shared by the bookings list, the booking page and the roster.
 * Server-safe, nothing hydrates.
 */

const TASK_LABELS: { key: keyof Tasks; short: string; long: string }[] = [
  { key: "flights", short: "F", long: "Flights" },
  { key: "rooming", short: "R", long: "Rooming" },
  { key: "details", short: "D", long: "Details" },
];

/**
 * Flights, rooming and details as three small squares: filled with a tick when
 * done, an empty hairline box when not. The letters keep them apart on a
 * scan; the accessible name says the whole thing.
 */
export function TaskTicks({ tasks, className }: { tasks: Tasks; className?: string }) {
  const done = TASK_LABELS.filter((t) => tasks[t.key]).length;
  const summary = TASK_LABELS.map((t) => `${t.long} ${tasks[t.key] ? "done" : "not done"}`).join(", ");
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={`${done} of 3 tasks: ${summary}`}>
      {TASK_LABELS.map((t) => (
        <span
          key={t.key}
          title={`${t.long}: ${tasks[t.key] ? "done" : "not yet"}`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center border font-body text-[10px] leading-none",
            tasks[t.key]
              ? "border-[--accent-solid] bg-[--accent-solid] text-[--accent-contrast]"
              : "border-[--rule-strong] text-[--text-muted]",
          )}
        >
          {tasks[t.key] ? "✓" : t.short}
        </span>
      ))}
    </span>
  );
}

/** Marks a booking made in the last 24 hours. */
export function NewMark() {
  return (
    <Badge tone="new" className="ml-2 align-middle">
      New
    </Badge>
  );
}

/** An absent value, said in words rather than left as a dash to squint at. */
export function Missing({ children = "None" }: { children?: React.ReactNode }) {
  return <span className="text-[--text-muted]">{children}</span>;
}

/** Yes / No, with the no muted so a column of them scans. */
export function YesNo({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) {
  return value ? <span className="text-[--text]">{yes}</span> : <span className="text-[--text-muted]">{no}</span>;
}

export const linkClass =
  "text-[--text] underline decoration-[--rule-strong] underline-offset-4 transition-colors duration-fast hover:text-[--accent] hover:decoration-[--accent]";
