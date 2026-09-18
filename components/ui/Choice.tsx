import { cn } from "./cn";

/**
 * Checkboxes and radios, drawn once.
 *
 * The native input stays in the tree, restyled with `appearance-none`, so
 * keyboard, form submission, `required` and screen readers all behave as the
 * browser means them to, before hydration as much as after. What is drawn on
 * top is only the mark: a tick for a checkbox, a square dot for a radio, both
 * shown by `peer-checked` so the state is pure CSS.
 *
 * The box is ruled in --text-secondary rather than --rule-strong: a control's
 * edge is the only thing that says "this is a control", so it has to clear the
 * 3:1 non-text contrast minimum (taupe is 5.6:1 on chalk; the 50% rule is
 * about 2.8:1).
 *
 * `CheckRow` is the whole-row version used for consent (terms, the SMS
 * opt-in, the charge authorization): the row is the <label>, so the tap
 * target is the box around the sentence rather than a 20px square. Links
 * inside the sentence stay links; the HTML spec does not toggle a label's
 * control when the click lands on interactive content inside it.
 */

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const BOX =
  "peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none " +
  "border border-[--text-secondary] bg-[--surface-raised] " +
  "transition-colors duration-fast ease-out " +
  "hover:border-[--text] " +
  "checked:border-[--accent-solid] checked:bg-[--accent-solid] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** A checkbox with a drawn tick. 20px, square, aligned to the first line of its label. */
export function CheckControl({ className, ...props }: InputProps) {
  return (
    <span className={cn("relative inline-grid h-5 w-5 shrink-0 place-items-center", className)}>
      <input type="checkbox" className={BOX} {...props} />
      <svg
        aria-hidden="true"
        viewBox="0 0 12 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        className={cn(
          "pointer-events-none relative h-2.5 w-3 text-[--accent-contrast]",
          "opacity-0 transition-opacity duration-fast peer-checked:opacity-100",
        )}
      >
        <path d="M1.5 5.25 4.5 8.25 10.5 1.75" />
      </svg>
    </span>
  );
}

/** A radio: round, because one-of-several reads as a circle everywhere else. */
export function RadioControl({ className, ...props }: InputProps) {
  return (
    <span className={cn("relative inline-grid h-5 w-5 shrink-0 place-items-center", className)}>
      <input type="radio" className={cn(BOX, "rounded-full")} {...props} />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none relative h-2 w-2 rounded-full bg-[--accent-contrast]",
          "opacity-0 transition-opacity duration-fast peer-checked:opacity-100",
        )}
      />
    </span>
  );
}

/**
 * A consent row: the checkbox and the sentence it agrees to, in one hairline
 * box that is itself the label. The rule darkens once it is ticked, so a row
 * that has been agreed to reads differently from one that has not, without
 * relying on the 20px mark alone.
 */
export function CheckRow({
  children,
  boxed = true,
  className,
  ...props
}: InputProps & { children: React.ReactNode; boxed?: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3.5",
        boxed &&
          "border border-[--rule] p-4 transition-colors duration-fast ease-out " +
            "hover:border-[--rule-strong] has-[:checked]:border-[--accent-solid] sm:p-5",
        "has-[:disabled]:cursor-not-allowed",
        className,
      )}
    >
      {/* Nudged to sit on the first line's x-height at leading 1.7. */}
      <CheckControl className="mt-[0.2rem]" {...props} />
      <span className="min-w-0 font-body text-body-s leading-[1.7] text-[--text-secondary]">
        {children}
      </span>
    </label>
  );
}
