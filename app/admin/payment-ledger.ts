import { toCents } from "@/lib/balance";
import type { BookingStatus, PaymentStatus } from "@/app/admin/admin-ui";

/*
 * Reading a booking's payment rows the way an operator needs to see them.
 *
 * The payments table has no column saying what a row is for. Stripe knows (the
 * PaymentIntent's metadata.kind, see lib/balance.ts), but asking Stripe once
 * per row would make the overview cost a network round trip per booking. The
 * rows already carry enough to tell the kinds apart:
 *
 *   installment  has a scheduled_date. Only scheduleInstallments writes one.
 *   checkout     no scheduled_date, written by createBooking for the deposit
 *                or the full price. Its amount is deposit_amount on the
 *                deposit plan and total_amount on the pay-in-full plan.
 *   balance      no scheduled_date, written by startBalancePayment. Only
 *                possible once the deposit has cleared, so never on a pending
 *                booking.
 *
 * The one ambiguity is an early payment for exactly the deposit's amount.
 * The checkout row is then the one that cleared first (paid_at), which is
 * always the checkout: an early payment cannot start before it.
 *
 * Plan: a booking with any installment row is on the deposit plan. Otherwise it
 * is pay-in-full when its checkout row asked for the whole total. A
 * pay-in-full booking's total_amount already has the discount off (see
 * lib/deposit.ts), so every figure below is right for it without knowing a
 * discount exists.
 *
 * Pure, no server imports: DashboardView and the payments page both use it and
 * both are fed from fixtures in the same shape.
 */

export type LedgerPayment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  scheduled_date: string | null;
  attempt_count: number;
  paid_at: string | null;
};

export type LedgerBooking = {
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  payments: LedgerPayment[];
};

export type PaymentPlanKind = "deposit" | "full";
export type PaymentRowKind = "checkout" | "installment" | "balance";

/** How a line reads: `flag` needs a person, `muted` is history, `notice` is money going back. */
export type LineTone = "normal" | "flag" | "muted" | "notice";

export type LedgerLine = {
  payment: LedgerPayment;
  kind: PaymentRowKind;
  /** "Deposit", "Full payment", "Installment", "Early payment". */
  what: string;
  /** A day (YYYY-MM-DD) to show, or null. */
  date: string | null;
  /** The status, in words that say why, not just what. */
  label: string;
  tone: LineTone;
};

export type Ledger = {
  plan: PaymentPlanKind;
  /** Visible lines, oldest first. Abandoned early payments are not among them. */
  lines: LedgerLine[];
  /** Early payment attempts the traveler walked away from. Never charged. */
  abandoned: number;
  paidCents: number;
  /** Still owed; zero on a cancelled booking, which owes nothing further. */
  remainingCents: number;
  overpaidCents: number;
  refundedCents: number;
  /** Early payments that cleared. */
  paidAheadCents: number;
  /** Early payments that cleared, as a count. */
  paidAheadCount: number;
};

export function readLedger(booking: LedgerBooking, today: string): Ledger {
  const payments = booking.payments ?? [];
  const totalCents = toCents(booking.total_amount);
  const depositCents = toCents(booking.deposit_amount);

  const installments = payments.filter((p) => p.scheduled_date !== null);
  const unscheduled = payments.filter((p) => p.scheduled_date === null);
  const checkout = findCheckoutRow(booking.status, unscheduled, depositCents, totalCents);
  const balance = booking.status === "pending" ? [] : unscheduled.filter((p) => p !== checkout);

  const plan: PaymentPlanKind =
    installments.length === 0 &&
    checkout !== null &&
    toCents(checkout.amount) === totalCents &&
    totalCents !== depositCents
      ? "full"
      : "deposit";

  const sum = (rows: LedgerPayment[]) => rows.reduce((cents, p) => cents + toCents(p.amount), 0);
  const succeeded = payments.filter((p) => p.status === "succeeded");
  const paidCents = sum(succeeded);
  const paidAhead = balance.filter((p) => p.status === "succeeded");
  const paidAheadCents = sum(paidAhead);

  const lines: LedgerLine[] = [];

  if (checkout) {
    lines.push({
      payment: checkout,
      kind: "checkout",
      what: plan === "full" ? "Full payment" : "Deposit",
      date: day(checkout.paid_at),
      ...checkoutStatus(checkout, plan),
    });
  }
  // A pending booking's extra unscheduled rows are also checkout attempts;
  // shown the same way rather than mislabelled as early payments.
  if (booking.status === "pending") {
    for (const row of unscheduled.filter((p) => p !== checkout)) {
      lines.push({
        payment: row,
        kind: "checkout",
        what: plan === "full" ? "Full payment" : "Deposit",
        date: day(row.paid_at),
        ...checkoutStatus(row, plan),
      });
    }
  }

  const covered = coveredInstallments(booking.status, installments, paidAheadCents);
  for (const row of installments) {
    lines.push({
      payment: row,
      kind: "installment",
      what: "Installment",
      date: row.scheduled_date,
      ...installmentStatus(row, booking.status, covered.has(row.id), today),
    });
  }

  let abandoned = 0;
  for (const row of balance) {
    if (row.status === "canceled") {
      abandoned += 1;
      continue;
    }
    lines.push({
      payment: row,
      kind: "balance",
      what: "Early payment",
      date: day(row.paid_at),
      ...balanceStatus(row, booking.status),
    });
  }

  // Checkout first, then everything else by its day; undated (in progress)
  // lines last.
  lines.sort((a, b) => {
    if (a.kind === "checkout" && b.kind !== "checkout") return -1;
    if (b.kind === "checkout" && a.kind !== "checkout") return 1;
    return (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31");
  });

  return {
    plan,
    lines,
    abandoned,
    paidCents,
    remainingCents: booking.status === "cancelled" ? 0 : Math.max(0, totalCents - paidCents),
    overpaidCents: Math.max(0, paidCents - totalCents),
    refundedCents: sum(payments.filter((p) => p.status === "refunded")),
    paidAheadCents,
    paidAheadCount: paidAhead.length,
  };
}

/** Whether a line belongs on the flagged list: an installment that needs a person. */
export function isFlagged(line: LedgerLine): boolean {
  return line.kind === "installment" && line.tone === "flag";
}

function findCheckoutRow(
  status: BookingStatus,
  unscheduled: LedgerPayment[],
  depositCents: number,
  totalCents: number,
): LedgerPayment | null {
  if (unscheduled.length === 0) return null;

  const matching = unscheduled.filter((p) => {
    const cents = toCents(p.amount);
    return cents === depositCents || cents === totalCents;
  });
  const pool = matching.length > 0 ? matching : status === "pending" ? unscheduled : [];
  if (pool.length === 0) return null;

  // The one that cleared first; failing that, any at all.
  const cleared = pool
    .filter((p) => p.status === "succeeded" || p.status === "refunded")
    .sort((a, b) => (a.paid_at ?? "").localeCompare(b.paid_at ?? ""));
  return cleared[0] ?? pool[0];
}

/*
 * Which cancelled installments an early payment made unnecessary.
 *
 * On a booking that is still live, reconcileInstallments is the only thing
 * that cancels an installment, so once anything has been paid ahead every
 * cancelled installment is one it covered. On a cancelled booking, cancelling
 * the booking also cancels whatever was left, and the two cannot be told apart
 * row by row. Reconcile covers the earliest first, so the earliest cancelled
 * rows, up to what was paid ahead, are read as covered and the rest as stopped
 * by the cancellation. A partly covered row that was later stopped can be read
 * as covered; that is the one case this gets wrong, and it is on a cancelled
 * booking, where it changes nothing owed.
 */
function coveredInstallments(
  status: BookingStatus,
  installments: LedgerPayment[],
  paidAheadCents: number,
): Set<string> {
  const covered = new Set<string>();
  if (paidAheadCents <= 0) return covered;

  const cancelled = installments
    .filter((p) => p.status === "canceled")
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));

  if (status !== "cancelled") {
    for (const row of cancelled) covered.add(row.id);
    return covered;
  }

  let running = 0;
  for (const row of cancelled) {
    running += toCents(row.amount);
    if (running > paidAheadCents) break;
    covered.add(row.id);
  }
  return covered;
}

function checkoutStatus(row: LedgerPayment, plan: PaymentPlanKind): { label: string; tone: LineTone } {
  switch (row.status) {
    case "succeeded":
      return { label: "Paid", tone: "normal" };
    case "pending":
      return { label: plan === "full" ? "Awaiting payment" : "Awaiting deposit", tone: "muted" };
    case "failed":
      // The traveler was on the page and saw the decline; they can try again
      // with another card. Not something to chase.
      return { label: "Declined at checkout", tone: "muted" };
    case "refunded":
      return { label: "Refunded", tone: "notice" };
    case "canceled":
      return { label: "Not completed", tone: "muted" };
    default:
      return { label: row.status, tone: "muted" };
  }
}

function installmentStatus(
  row: LedgerPayment,
  bookingStatus: BookingStatus,
  covered: boolean,
  today: string,
): { label: string; tone: LineTone } {
  const attempts =
    row.attempt_count > 0 ? ` after ${row.attempt_count} attempt${row.attempt_count === 1 ? "" : "s"}` : "";

  switch (row.status) {
    case "scheduled":
      if (row.scheduled_date && row.scheduled_date < today) return { label: `Overdue${attempts}`, tone: "flag" };
      return { label: `Scheduled${attempts}`, tone: "normal" };
    case "succeeded":
      return { label: "Paid", tone: "normal" };
    case "failed":
      return { label: `Failed${attempts}`, tone: "flag" };
    case "requires_action":
      return { label: "Needs authentication", tone: "flag" };
    case "refunded":
      return { label: "Refunded", tone: "notice" };
    case "canceled":
      if (covered) return { label: "Covered by early payment", tone: "muted" };
      if (bookingStatus === "cancelled") return { label: "Stopped at cancellation", tone: "muted" };
      return { label: "Canceled", tone: "muted" };
    case "pending":
      return { label: "Charging", tone: "normal" };
  }
}

function balanceStatus(row: LedgerPayment, bookingStatus: BookingStatus): { label: string; tone: LineTone } {
  switch (row.status) {
    case "succeeded":
      return { label: "Paid", tone: "normal" };
    case "pending":
      // A card form the traveler has open. On a cancelled booking it can no
      // longer be finished, and is the same as abandoned.
      return bookingStatus === "cancelled"
        ? { label: "Not completed", tone: "muted" }
        : { label: "In progress", tone: "muted" };
    case "refunded":
      return { label: "Refunded", tone: "notice" };
    case "failed":
      return { label: "Declined", tone: "muted" };
    default:
      return { label: row.status, tone: "muted" };
  }
}

/** The YYYY-MM-DD part of a timestamp, or null. */
function day(timestamp: string | null): string | null {
  return timestamp ? timestamp.slice(0, 10) : null;
}
