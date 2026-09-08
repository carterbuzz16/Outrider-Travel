import { cn } from "@/components/ui";

/**
 * A visible stand-in for copy that only the Outrider team can write.
 *
 * Deliberately obvious. The alternative is either an empty section, which looks
 * broken, or invented prose, which is worse: a founder's story and a partner's
 * description of themselves are not ours to guess at. This holds the layout so
 * the real copy can be dropped in without redesigning anything, and it is
 * unmistakably not finished, so it cannot be shipped by accident.
 */
export default function DraftCopy({
  label,
  children,
  className,
}: {
  /** What is missing, e.g. "Carter's story". */
  label: string;
  /** What the finished copy should cover. */
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
      <p className="t-micro text-[--flag-ink]">Draft placeholder · {label}</p>
      <div className="mt-3 font-body text-body-s leading-[1.7] text-[--text-secondary]">
        {children}
      </div>
    </div>
  );
}
