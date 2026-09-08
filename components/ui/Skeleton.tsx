import { cn } from "./cn";

/**
 * Loading placeholder.
 *
 * A blank hairline block in the scheme's own rule colour, not a grey chip and
 * not a shimmering gradient sweep — the system's motion budget is a fade, so
 * this fades in place and nothing travels across it.
 *
 * Callers size it with utilities (`<Skeleton className="h-4 w-40" />`). Blocks
 * are decorative by definition, so each one is hidden from the accessibility
 * tree; announce the wait once, on the container, with `SkeletonGroup`.
 */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-sm bg-[--rule-faint] animate-pulse", className)}
    />
  );
}

/**
 * Wraps a set of blocks and gives a screen reader the one sentence it needs.
 * `aria-busy` rather than a live region: the page is about to be replaced
 * wholesale, so there is nothing to politely announce twice.
 */
export function SkeletonGroup({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
