import { cn } from "./cn";

/**
 * Inline alert — a message that belongs *in* the page, under a form or at the
 * top of a section. Drawn as a hairline box with a heavier rule down the left
 * edge, the way a stamped notice is ruled off on a document. Icons are square
 * glyphs rather than filled circles; nothing here looks like a system dialog.
 */

export type AlertTone = "info" | "success" | "warning" | "error";

// The edge rule and the marker square are graphics, so they carry the full
// brand values; the copy beside them is always --text, which is readable on
// every scheme.
const TONES: Record<AlertTone, { edge: string; mark: string; word: string }> = {
  info: { edge: "border-l-[--accent]", mark: "bg-[--accent]", word: "Note" },
  success: { edge: "border-l-[--color-teal]", mark: "bg-[--color-teal]", word: "Confirmed" },
  warning: { edge: "border-l-[--flag]", mark: "bg-[--flag]", word: "Heads up" },
  error: { edge: "border-l-[--flag]", mark: "bg-[--flag]", word: "Problem" },
};

type AlertProps = {
  tone?: AlertTone;
  /** Overrides the tone's default word ("Note", "Confirmed", …). */
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function Alert({
  tone = "info",
  title,
  children,
  className,
}: AlertProps) {
  const t = TONES[tone];
  return (
    <div
      // Errors interrupt; everything else waits for a pause in speech.
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3.5 border border-l-2 border-[--rule] bg-[--surface-raised] px-4 py-3.5",
        t.edge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("mt-[0.45rem] h-1.5 w-1.5 shrink-0", t.mark)} />
      <div className="min-w-0">
        <p className="t-micro text-[--text]">{title ?? t.word}</p>
        {children && (
          <div className="mt-1.5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
