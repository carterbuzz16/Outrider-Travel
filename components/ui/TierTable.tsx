import Button from "./Button";
import Badge from "./Badge";
import { cn } from "./cn";
import { tierDisplayName } from "@/lib/tier-display";

/**
 * The three packages, side by side.
 *
 * Built as a set of columns rather than a feature matrix with ticks: the tiers
 * here don't share a single list of features that each either has or doesn't —
 * the top tier swaps standard rentals back in and adds a chef, and a tick grid
 * would flatten that into something misleading. Each column states what it
 * actually includes.
 *
 * The middle tier is marked only when there are exactly three ungrouped ones.
 * Grouped tiers (the two penthouses, which are the same kind of package in
 * two places) sit together under their group's name below the rest, so four
 * packages read as three choices, one of which has two versions.
 */

export type TierView = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  inclusions: string[];
  spotsLeft: number | null;
  /**
   * Packages that are variations of one thing (the two penthouses) share a
   * group name, and sit together under it below the rest instead of as more
   * equal columns. Ungrouped when null or omitted.
   */
  group?: string | null;
  /** A line under the group name, from the first tier in the group that has one. */
  groupNote?: string | null;
  /**
   * Booked whole by another group (a penthouse). Shown as taken, with the way
   * back in for that group's friends, rather than as plainly sold out.
   */
  taken?: boolean;
};

/** Said on a taken penthouse, here and on the room showcase. */
export const TAKEN_NOTE = "Booked by another group. Have their group code? Enter it at checkout.";

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
  const plain = tiers.filter((t) => !t.group);
  const groups = [...new Set(tiers.map((t) => t.group).filter((g): g is string => Boolean(g)))];

  /*
   * No "most booked" badge: nothing has been booked yet, so it would be a
   * claim with nothing behind it. With three ungrouped tiers the top one is
   * still marked, for a fact rather than a steer: a penthouse is held for a
   * single group of eight. A grouped tier (a penthouse) is always marked as
   * the group's own.
   */
  const marks: Record<number, string> = plain.length === 3 ? { 2: "Your group only" } : {};

  return (
    <div className={cn("flex flex-col gap-10 md:gap-12", className)}>
      {plain.length > 0 && (
        <div
          className={cn(
            "grid gap-px border border-[--rule] bg-[--rule]",
            plain.length >= 3 ? "md:grid-cols-3" : plain.length === 2 && "md:grid-cols-2",
          )}
        >
          {plain.map((tier, i) => (
            <TierColumn key={tier.id} tier={tier} mark={marks[i]} bookHref={bookHref} />
          ))}
        </div>
      )}

      {groups.map((group) => {
        const members = tiers.filter((t) => t.group === group);
        const note = members.find((t) => t.groupNote)?.groupNote;
        return (
          <section key={group} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 border-t-2 border-[--accent] pt-5">
              <h3 className="t-heading text-[--text]">{group}</h3>
              {note && (
                <p className="max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
                  {note}
                </p>
              )}
            </div>
            <div
              className={cn(
                "grid gap-px border border-[--rule] bg-[--rule]",
                members.length > 1 && "md:grid-cols-2",
              )}
            >
              {members.map((tier) => (
                <TierColumn
                  key={tier.id}
                  tier={tier}
                  mark="Your group only"
                  bookHref={bookHref}
                  heading="h4"
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TierColumn({
  tier,
  mark,
  bookHref,
  heading: Heading = "h3",
}: {
  tier: TierView;
  mark?: string;
  bookHref?: string | null;
  heading?: "h3" | "h4";
}) {
  const featured = Boolean(mark);
  const soldOut = tier.spotsLeft !== null && tier.spotsLeft <= 0;
  const taken = Boolean(tier.taken);

  return (
    <section
      className={cn(
        // The featured column is marked with a rule, not a fill.
        // --surface-inset is a mid tone: --text-secondary lands on it at
        // 3.9:1 and --flag-ink at 4.3:1, so filling this column would
        // have put the tier description and every inclusion below AA.
        // A hairline is also more the house vocabulary than a panel.
        "flex flex-col gap-5 bg-[--surface-raised] p-6 md:p-7",
        featured && !taken && "border-t-2 border-[--accent]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Heading className="t-subheading text-[--text]">{tierDisplayName(tier.name)}</Heading>
          {tier.description && (
            <p className="font-body text-body-s text-[--text-secondary]">{tier.description}</p>
          )}
        </div>
        {taken ? (
          <Badge tone="closed">Taken</Badge>
        ) : (
          featured && !soldOut && <Badge plain>{mark}</Badge>
        )}
      </div>

      <p className="font-display font-medium text-display-s tracking-title text-[--text]">
        {tier.price}
        <span className="t-micro ml-2 text-[--text-muted]">per person</span>
      </p>

      <hr className="perforation" />

      <ul className="flex list-none flex-col gap-2.5 p-0">
        {tier.inclusions.map((item) => (
          <li key={item} className="flex gap-3">
            {/* A square, not a tick: these are line items on a manifest,
                not features being checked off against a competitor. */}
            <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 bg-[--accent]" />
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
          {!taken && tier.spotsLeft !== null && tier.spotsLeft > 0 && tier.spotsLeft <= 6
            ? "A few spots left"
            : "\u00a0"}
        </p>
        {taken ? (
          <p className="mt-2 font-body text-body-s leading-[1.6] text-[--text-secondary]">
            {TAKEN_NOTE}
          </p>
        ) : soldOut ? (
          <p className="t-micro mt-2 text-[--text-muted]">Sold out</p>
        ) : bookHref ? (
          <Button
            // Names the package, so checkout opens with it already
            // selected (by name, since one table can stand for several
            // departures whose tier ids differ).
            href={withPackage(bookHref, tier.name)}
            variant={featured ? "primary" : "secondary"}
            size="sm"
            block
            // Tier names can run long ("Penthouse 830"); a nowrap label
            // would overflow the card.
            className="mt-2 whitespace-normal"
          >
            Reserve
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function withPackage(href: string, name: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}package=${encodeURIComponent(name)}`;
}
