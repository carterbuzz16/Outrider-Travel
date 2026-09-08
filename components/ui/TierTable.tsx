import Button from "./Button";
import Badge from "./Badge";
import { cn } from "./cn";

/**
 * The three packages, side by side.
 *
 * Built as a set of columns rather than a feature matrix with ticks: the tiers
 * here don't share a single list of features that each either has or doesn't —
 * the top tier swaps standard rentals back in and adds a chef, and a tick grid
 * would flatten that into something misleading. Each column states what it
 * actually includes.
 *
 * The middle tier is marked only when there are exactly three, which is the
 * shape the Telluride packages take.
 */

export type TierView = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  inclusions: string[];
  spotsLeft: number | null;
};

export default function TierTable({
  tiers,
  bookHref,
  className,
}: {
  tiers: TierView[];
  /** Omitted when the trip can't be booked yet. */
  bookHref?: string | null;
  className?: string;
}) {
  /*
   * With three tiers, both the middle and the top are marked, for different
   * reasons: the middle is what most people take, the top is the one where the
   * suite is held for a single group. Marking only the middle left the most
   * expensive package reading as an afterthought. With two, the upper one is
   * the steer.
   */
  const marks: Record<number, string> =
    tiers.length === 3
      ? { 1: "Most booked", 2: "Your group only" }
      : tiers.length === 2
        ? { 1: "Most booked" }
        : {};

  return (
    <div
      className={cn(
        "grid gap-px border border-[--rule] bg-[--rule]",
        tiers.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2",
        className,
      )}
    >
      {tiers.map((tier, i) => {
        const mark = marks[i];
        const featured = Boolean(mark);
        const soldOut = tier.spotsLeft !== null && tier.spotsLeft <= 0;

        return (
          <section
            key={tier.id}
            className={cn(
              // The featured column is marked with a rule, not a fill.
              // --surface-inset is a mid tone: --text-secondary lands on it at
              // 3.9:1 and --flag-ink at 4.3:1, so filling this column would
              // have put the tier description and every inclusion below AA.
              // A hairline is also more the house vocabulary than a panel.
              "flex flex-col gap-5 bg-[--surface-raised] p-6 md:p-7",
              featured && "border-t-2 border-[--accent]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <h3 className="t-subheading text-[--text]">{tier.name}</h3>
                {tier.description && (
                  <p className="font-body text-body-s text-[--text-secondary]">
                    {tier.description}
                  </p>
                )}
              </div>
              {featured && !soldOut && <Badge plain>{mark}</Badge>}
            </div>

            <p className="font-display text-display-s tracking-title text-[--text]">
              {tier.price}
              <span className="t-micro ml-2 text-[--text-muted]">per person</span>
            </p>

            <hr className="perforation" />


            <ul className="flex list-none flex-col gap-2.5 p-0">
              {tier.inclusions.map((item) => (
                <li key={item} className="flex gap-3">
                  {/* A square, not a tick: these are line items on a manifest,
                      not features being checked off against a competitor. */}
                  <span
                    aria-hidden="true"
                    className="mt-[0.6em] h-1 w-1 shrink-0 bg-[--accent]"
                  />
                  <span className="font-body text-body-s leading-[1.6] text-[--text-secondary]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-2">
              {/* Scarcity sits above the button and always reserves its line, so
                  the CTAs across the row share a baseline whether or not a tier
                  is running low. */}
              <p className="t-micro min-h-[1.4em] text-[--flag-ink]">
                {tier.spotsLeft !== null && tier.spotsLeft > 0 && tier.spotsLeft <= 6
                  ? "Selling out fast"
                  : "\u00a0"}
              </p>
              {soldOut ? (
                <p className="t-micro mt-2 text-[--text-muted]">Sold out</p>
              ) : bookHref ? (
                <Button
                  href={bookHref}
                  variant={featured ? "primary" : "secondary"}
                  size="sm"
                  block
                  // Real tier names run long ("Signature Suite buyout"); a
                  // nowrap label would overflow the card.
                  className="mt-2 whitespace-normal"
                >
                  Reserve
                </Button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
