import { cn } from "./cn";
import { OutriderMark } from "./Logo";

/**
 * Section divider.
 *
 * Four flavours, in descending order of how often you should reach for them:
 * a plain hairline, a hairline broken by a tracked label, a hairline broken by
 * the eye mark, and a dashed perforation for the places where a page really is
 * meant to read as a ticket being torn.
 */

type DividerProps = {
  variant?: "rule" | "label" | "mark" | "perforation";
  /** Required by `label`, ignored by the others. */
  label?: string;
  className?: string;
};

export default function SectionDivider({
  variant = "rule",
  label,
  className,
}: DividerProps) {
  if (variant === "perforation") {
    return (
      <div className={cn("relative", className)} role="separator">
        <hr className="perforation" />
      </div>
    );
  }

  if (variant === "rule") {
    // Wrapped, not bare. Callers pass `className="shell"`, and .shell works by
    // padding-inline — but an <hr>'s border paints across the padding box, so a
    // bare <hr className="shell"> ignored the gutter and ran one full gutter
    // wider per side than every other divider on the page.
    return (
      <div className={className} role="separator">
        <hr className="border-t border-[--rule]" />
      </div>
    );
  }

  const center =
    variant === "mark" ? (
      <OutriderMark className="w-7 text-[--text-muted]" />
    ) : (
      <span className="t-micro text-[--text-secondary]">{label}</span>
    );

  return (
    <div
      className={cn("flex items-center gap-5", className)}
      role="separator"
      aria-label={variant === "label" ? label : undefined}
    >
      <span className="h-px flex-1 bg-[--rule]" />
      {center}
      <span className="h-px flex-1 bg-[--rule]" />
    </div>
  );
}
