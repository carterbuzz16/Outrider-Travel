import { cn } from "./cn";

/**
 * The one figure on a payment screen that must not be misread: what comes off
 * the card when the button is pressed.
 *
 * Set on espresso, the site's other ground, as the single dark panel on an
 * otherwise paper page, so it is the first thing the eye lands on and cannot
 * be confused with the trip price or a later installment printed nearby.
 * Paper on espresso is 10:1 and the secondary tier 6.4:1, so the small print
 * under the figure reads at AA like everything else.
 */
export default function AmountDue({
  label,
  amount,
  children,
  className,
}: {
  label: string;
  amount: React.ReactNode;
  /** One or two sentences on what the amount is and what follows it. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("scheme-espresso scheme-paint px-5 py-7 sm:px-8 sm:py-9", className)}>
      <p className="t-label text-[--text-secondary]">{label}</p>
      <p className="mt-4 font-display text-display-l font-medium leading-none tabular-nums tracking-title text-[--text]">
        {amount}
      </p>
      {children && (
        <div className="mt-5 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
          {children}
        </div>
      )}
    </div>
  );
}
