import { cn } from "@/components/ui";

/**
 * A stand-in for copy that only the Outrider team can write.
 *
 * It renders on the public site, so everything it shows is written for a
 * traveler: a "Coming soon" label and a line saying what will be here. The
 * notes on what the finished copy needs to say live in a comment beside each
 * use, never in what renders. Search for DraftCopy to find every gap before
 * launch. The dashed box keeps it visibly unfinished to the team without
 * reading as broken to a visitor.
 */
export default function DraftCopy({
  label,
  children,
  className,
}: {
  /** The topic, as a traveler would read it, e.g. "How the Montrose transfer works". */
  label: string;
  /** One customer-facing line about what will be here. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-[--rule-strong] bg-[--surface-raised] px-5 py-5",
        className,
      )}
    >
      <p className="t-micro text-[--flag-ink]">Coming soon · {label}</p>
      <div className="mt-3 font-body text-body-s leading-[1.7] text-[--text-secondary]">
        {children}
      </div>
    </div>
  );
}
