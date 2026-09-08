import { cn } from "./cn";

/**
 * The difference, side by side.
 *
 * Deliberately not a competitor callout. The left column is headed "How it
 * usually goes", not the name of anyone, because the honest claim is about the
 * standard way these trips get run, whether that is twenty friends and a group
 * chat or an operator selling a base price with the real cost bolted on later.
 * Naming a competitor would also invite a reply, and the facts do the work.
 *
 * Built as a definition list rather than a table: there are only two values per
 * row, so a table's header machinery buys nothing, and a list reflows to a
 * phone without a horizontal scroll or a hidden column.
 */

export type ComparisonRow = {
  /** What is being compared. Short. */
  label: string;
  /** The usual state of affairs. */
  usual: string;
  /** What Outrider does instead. */
  ours: string;
};

export default function Comparison({
  rows,
  usualHeading = "How it usually goes",
  oursHeading = "With Outrider",
  className,
}: {
  rows: ComparisonRow[];
  usualHeading?: string;
  oursHeading?: string;
  className?: string;
}) {
  return (
    <div className={cn("border border-[--rule] bg-[--surface-raised]", className)}>
      {/* Column headings. Hidden on a phone, where each row repeats them
          inline, because a sticky two-column header over stacked rows is
          exactly the pattern that stops making sense at 375px. */}
      <div className="hidden border-b border-[--rule-strong] md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="p-5" />
        <div className="p-5">
          <p className="t-micro text-[--text-muted]">{usualHeading}</p>
        </div>
        <div className="border-l-2 border-[--accent] p-5">
          <p className="t-micro text-[--accent]">{oursHeading}</p>
        </div>
      </div>

      <dl className="m-0">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "grid gap-x-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]",
              i > 0 && "border-t border-[--rule]",
            )}
          >
            <dt className="stamp-type px-5 pb-2 pt-5 text-[--text-muted] md:py-6">
              {row.label}
            </dt>

            <dd className="m-0 px-5 pb-4 md:py-6">
              <p className="t-micro mb-2 text-[--text-muted] md:hidden">
                {usualHeading}
              </p>
              <p className="font-body text-body-s leading-[1.65] text-[--text-secondary]">
                {row.usual}
              </p>
            </dd>

            {/* The accent rule runs the height of the column on desktop and
                across the top of the block on a phone, so the Outrider side
                stays visually distinct in both layouts. */}
            <dd className="m-0 border-t-2 border-[--accent] px-5 py-4 md:border-l-2 md:border-t-0 md:py-6">
              <p className="t-micro mb-2 text-[--accent] md:hidden">{oursHeading}</p>
              <p className="font-body text-body-s leading-[1.65] text-[--text]">
                {row.ours}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
