import { cn } from "./cn";

/**
 * A row of labelled facts: trip, dates, package, what is paid. The account
 * pages all open their summaries this way, so it is drawn once.
 *
 * Label above value, tracked micro capitals over Medium figures, on a grid
 * rather than in boxes: the same "figures on one hairline" treatment the
 * Telluride facts use. Two columns on a phone, so a 375px screen never has
 * to fit four; `columns` sets how many there are once there is room.
 */

export type Fact = {
  label: string;
  value: React.ReactNode;
  /** A quieter second line under the value: "of $4,500", a due date. */
  note?: React.ReactNode;
};

const COLUMNS = {
  2: "",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
} as const;

export default function Facts({
  items,
  columns = 4,
  size = "m",
  className,
}: {
  items: Fact[];
  columns?: keyof typeof COLUMNS;
  /** `l` for the headline figures of a summary, `m` for supporting facts. */
  size?: "m" | "l";
  className?: string;
}) {
  return (
    <dl className={cn("m-0 grid grid-cols-2 gap-x-6 gap-y-6", COLUMNS[columns], className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="t-micro text-[--text-secondary]">{item.label}</dt>
          <dd
            className={cn(
              "m-0 mt-2 break-words font-display font-medium tabular-nums tracking-title text-[--text]",
              size === "l" ? "text-display-s leading-tight" : "text-body leading-snug",
            )}
          >
            {item.value}
            {item.note && (
              <span className="mt-1 block font-body text-body-s font-normal tracking-normal text-[--text-secondary]">
                {item.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
