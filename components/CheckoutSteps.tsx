import { cn } from "@/components/ui";

/**
 * Where the traveler is in checkout: 1 Package, 2 Payment.
 *
 * Two steps is the whole flow, and saying so is most of the reassurance: the
 * card field is one screen away, and nothing comes after it but the
 * confirmation. Not links. Going back from the payment step to the package
 * step would start a second booking, so the way back is the page's own link.
 *
 * The markers are the portal checklist's: an open square with the number to
 * come, a filled one for where you are, a tick for done.
 */
const STEPS = ["Package", "Payment"] as const;

export default function CheckoutSteps({ current, className }: { current: 1 | 2; className?: string }) {
  return (
    <nav aria-label="Checkout progress" className={className}>
      <ol className="m-0 flex list-none items-center gap-3 p-0">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const state = step < current ? "done" : step === current ? "current" : "todo";
          return (
            <li key={label} className="flex items-center gap-3" aria-current={state === "current" ? "step" : undefined}>
              {i > 0 && <span aria-hidden="true" className="h-px w-6 bg-[--rule-strong] sm:w-10" />}
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center border text-[0.6875rem] font-medium tabular-nums",
                  state === "todo"
                    ? "border-[--text-secondary] text-[--text-secondary]"
                    : "border-[--accent-solid] bg-[--accent-solid] text-[--accent-contrast]",
                )}
              >
                {state === "done" ? (
                  <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" className="h-2.5 w-3">
                    <path d="M1.5 5.25 4.5 8.25 10.5 1.75" />
                  </svg>
                ) : (
                  step
                )}
              </span>
              <span className={cn("t-micro", state === "todo" ? "text-[--text-secondary]" : "text-[--text]")}>
                <span className="sr-only">
                  Step {step} of {STEPS.length}:{" "}
                </span>
                {label}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
