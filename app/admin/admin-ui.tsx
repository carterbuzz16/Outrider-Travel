import Link from "next/link";
import { Badge, cn, type BadgeTone } from "@/components/ui";
import type { Database } from "@/types/supabase";

/**
 * The back-office kit.
 *
 * Everything here is deliberately quieter and denser than the public site.
 * The marketing pages are read; these are scanned and operated, so there are
 * no stamps, no display type and no decorative dividers — just the system's
 * hairlines, tracked mono labels and semantic colour tokens, so it still
 * reads as the same product.
 *
 * All Server Components: the admin screens are forms posting server actions
 * and nothing here needs to hydrate. `Field` from components/ui takes a render
 * function as its child, which cannot cross the server/client boundary, so the
 * label scaffolding is rebuilt here in a server-safe shape.
 *
 * Lives under app/admin/ rather than components/ui/ on purpose: none of it is
 * part of the customer-facing design system.
 */

export type TripStatus = Database["public"]["Enums"]["trip_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/* -- page furniture -------------------------------------------------------- */

/**
 * The masthead every admin screen opens with. `t-subheading` rather than
 * `t-title`: a back office wants the top of the page to cost as little
 * vertical space as possible.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  back,
}: {
  eyebrow: string;
  title: string;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="border-b border-[--rule] pb-6 pt-8 md:pt-10">
      {back && (
        <Link
          href={back.href}
          className="t-micro inline-block text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
        >
          &larr; {back.label}
        </Link>
      )}
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-x-8 gap-y-4",
          back && "mt-5",
        )}
      >
        <div className="min-w-0">
          <p className="t-micro text-[--text-muted]">{eyebrow}</p>
          <h1 className="t-subheading mt-2.5 break-words text-[--text]">{title}</h1>
          {lede && (
            <p className="mt-2.5 max-w-measure font-body text-body-s text-[--text-secondary]">
              {lede}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * A titled box. The heading sits in a hairline-ruled bar rather than floating
 * above the box, so a column of panels reads as one ledger instead of a stack
 * of unrelated cards.
 */
export function Panel({
  title,
  description,
  actions,
  bleed = false,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Drops the body padding, for a panel whose whole body is a table. */
  bleed?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-[--rule] bg-[--surface-raised]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[--rule] px-5 py-4">
        <div className="min-w-0">
          <h2 className="t-micro text-[--text]">{title}</h2>
          {description && (
            <p className="mt-2 max-w-measure font-body text-body-s text-[--text-secondary]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      <div className={bleed ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/**
 * Wide tables scroll inside their own box so the page never scrolls sideways.
 * `tabindex` + a label make that box reachable and announced for keyboard and
 * screen-reader users, which a bare `overflow-x-auto` div is not.
 */
export function TableScroll({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="w-full overflow-x-auto focus-visible:outline-offset-[-2px]"
    >
      {children}
    </div>
  );
}

/** Shared table shell: hairline rules, mono heads, tabular figures. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-left tabular-nums">{children}</table>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        // --text-secondary on --surface (paper) is 4.95:1. The head bar is
        // paper rather than --surface-inset because bone is a mid tone and
        // drops secondary text to 3.9:1.
        "whitespace-nowrap border-b border-[--rule-strong] bg-[--surface] px-4 py-3",
        "t-micro font-normal text-[--text-secondary]",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-[--rule-faint] px-4 py-3.5 align-top",
        "font-body text-body-s text-[--text]",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

/**
 * A real empty state. Says what the thing is, why it is blank and what the one
 * next move is — never a bare "None".
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-[--rule-strong] px-5 py-8">
      <p className="t-micro text-[--text]">{title}</p>
      <p className="max-w-measure-tight font-body text-body-s text-[--text-secondary]">
        {children}
      </p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** A single figure with its label. Used in the dashboard's top row. */
export function Figure({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "default" | "flag";
}) {
  return (
    <div className="min-w-0 border-t border-[--rule-strong] pt-3.5">
      <p className="t-micro text-[--text-secondary]">{label}</p>
      <p
        className={cn(
          "mt-2.5 font-display text-display-s tabular-nums tracking-title",
          // --flag-ink is 5.4:1 on paper and 5.8:1 on white; brand orange
          // itself is 3.6:1 and never carries a figure.
          tone === "flag" ? "text-[--flag-ink]" : "text-[--text]",
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1.5 font-body text-body-s text-[--text-secondary]">{note}</p>}
    </div>
  );
}

/* -- status ---------------------------------------------------------------- */

/**
 * Trip status, said the same way everywhere.
 *
 * `published` gets the one filled badge in the system because it is the only
 * status with a consequence outside this tool: the trip is on the public site.
 */
export const TRIP_STATUS_META: Record<
  TripStatus,
  { tone: BadgeTone; label: string; blurb: string }
> = {
  draft: {
    tone: "neutral",
    label: "Draft",
    blurb: "Only visible here. Nobody outside the team can see or book it.",
  },
  published: {
    tone: "new",
    label: "Published",
    blurb: "Live on the public site and bookable as soon as you save.",
  },
  closed: {
    tone: "closed",
    label: "Closed",
    blurb: "Off the public site. Existing bookings are untouched.",
  },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const meta = TRIP_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const BOOKING_STATUS_META: Record<BookingStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: "urgent", label: "Deposit due" },
  deposit_paid: { tone: "open", label: "Deposit paid" },
  paid_in_full: { tone: "new", label: "Paid in full" },
  cancelled: { tone: "closed", label: "Cancelled" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  scheduled: "Scheduled",
  pending: "Pending",
  succeeded: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  canceled: "Canceled",
  requires_action: "Needs authentication",
};

/* -- capacity -------------------------------------------------------------- */

/**
 * How full a departure is.
 *
 * `capacity` is null when at least one tier has no limit, in which case there
 * is no denominator to divide by and the meter is replaced by a plain count.
 */
export function Fill({
  booked,
  capacity,
}: {
  booked: number;
  capacity: number | null;
}) {
  if (capacity === null) {
    return (
      <span className="font-body text-body-s tabular-nums text-[--text-secondary]">
        {booked} booked
        <span className="text-[--text-muted]">, no cap set</span>
      </span>
    );
  }

  // A zero cap is a real (if odd) state, and dividing by it would render NaN%.
  const share = capacity === 0 ? 100 : Math.min(100, Math.round((booked / capacity) * 100));
  const full = booked >= capacity;

  return (
    <span className="inline-flex min-w-[7.5rem] flex-col gap-1.5">
      <span className="font-body text-body-s tabular-nums text-[--text]">
        {booked}
        <span className="text-[--text-muted]"> / </span>
        {capacity}
        <span className="ml-1.5 text-[--text-secondary]">{share}%</span>
      </span>
      {/* A 3px hairline meter, the same vocabulary as every other rule here.
          The figures above already carry the number, so it is decoration. */}
      <span aria-hidden="true" className="block h-[3px] w-full bg-[--rule-faint]">
        <span
          className={cn("block h-full", full ? "bg-[--flag]" : "bg-[--accent]")}
          style={{ width: `${Math.max(share, booked > 0 ? 2 : 0)}%` }}
        />
      </span>
    </span>
  );
}

/**
 * Sums tier capacities, returning null the moment one tier is uncapped: a
 * partial denominator would read as a real one and understate how full a
 * departure is.
 */
export function totalCapacity(tiers: { max_capacity: number | null }[]): number | null {
  if (tiers.length === 0) return null;
  if (tiers.some((tier) => tier.max_capacity === null)) return null;
  return tiers.reduce((sum, tier) => sum + (tier.max_capacity ?? 0), 0);
}

/** A cancelled booking has given its spot back, so it does not count. */
/**
 * How many spots a departure has actually sold.
 *
 * A `pending` booking is a row created when someone opened checkout, and it
 * stays pending until Stripe confirms the deposit, so every abandoned checkout
 * looked like a sale here. Only a paid deposit counts, which matches what the
 * public availability on the trip page reports (see SPOT_HOLDING in
 * lib/trips.ts). Use `countPending` if you want the unconfirmed ones.
 */
export function countHeld(bookings: { status: BookingStatus }[]): number {
  return bookings.filter(
    (booking) => booking.status === "deposit_paid" || booking.status === "paid_in_full",
  ).length;
}

/** Checkouts started but not paid for. Useful context, never a held spot. */
export function countPending(bookings: { status: BookingStatus }[]): number {
  return bookings.filter((booking) => booking.status === "pending").length;
}

/* -- forms ----------------------------------------------------------------- */

/**
 * Label, control, hint. The server-safe counterpart to `Field`, which owns the
 * same scaffolding but hands its child a render function.
 */
export function AdminField({
  label,
  htmlFor,
  hint,
  required = false,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="t-micro text-[--text-secondary]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1.5 text-[--flag-ink]">
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="font-body text-body-s text-[--text-muted]">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The status control: all three states and their consequences visible at once.
 *
 * A `<select>` hides two thirds of the decision behind a click and says nothing
 * about what publishing does, and publishing puts a trip on the public site the
 * moment the form is saved. Radios cost three rows and make that plain.
 *
 * The input itself is visually hidden and the box beside it is styled off
 * `peer-checked`, so the whole row is the target and keyboard focus still draws
 * a ring (`peer-focus-visible`) rather than disappearing with the control.
 */
export function StatusChoice({
  name = "status",
  current,
}: {
  name?: string;
  current: TripStatus;
}) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Trip status</legend>
      <div className="flex flex-col gap-2">
        {(Object.keys(TRIP_STATUS_META) as TripStatus[]).map((status) => {
          const meta = TRIP_STATUS_META[status];
          return (
            <label key={status} className="block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={status}
                defaultChecked={status === current}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex items-start gap-3 border border-[--rule] px-3.5 py-3",
                  "transition-colors duration-fast ease-out hover:border-[--text-secondary]",
                  "peer-checked:border-[--accent] peer-checked:bg-[--surface]",
                  "peer-focus-visible:outline peer-focus-visible:outline-2",
                  "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[--focus-ring]",
                  // The marker is a grandchild of the peer, not a sibling, so
                  // it cannot use a bare `peer-checked:` — the checked state is
                  // pushed down to it from here instead.
                  "peer-checked:[&>span:first-child]:border-[--accent]",
                  "peer-checked:[&>span:first-child]:bg-[--accent]",
                )}
              >
                {/* The same filled square the design system's checkbox uses,
                    rather than a round radio dot. */}
                <span
                  aria-hidden="true"
                  className="mt-1 h-3.5 w-3.5 shrink-0 border border-[--rule-strong]"
                />
                <span className="min-w-0">
                  <span className="t-micro block text-[--text]">{meta.label}</span>
                  <span className="mt-1.5 block font-body text-body-s text-[--text-secondary]">
                    {meta.blurb}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A key/value line for read-only detail, set tight enough to scan a column of. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[--rule-faint] py-2.5 last:border-b-0">
      <dt className="t-micro text-[--text-secondary]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-body text-body-s tabular-nums text-[--text]">
        {children}
      </dd>
    </div>
  );
}
