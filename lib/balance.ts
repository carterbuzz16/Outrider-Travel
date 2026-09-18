/*
 * Money arithmetic for paying down a booking's balance.
 *
 * Kept free of any server import so the bookings page's client form can show
 * the same minimum the server enforces, rather than restating it. The server
 * never trusts the form: startBalancePayment re-derives what is owed from the
 * payments table and runs the requested figure through validateBalanceAmount
 * again before a PaymentIntent exists.
 *
 * Everything is done in whole cents. The amounts come out of Postgres as
 * numeric(10,2) and arrive as JS floats, and summing floats is how a booking
 * ends up "owing" $0.0000000001 and never reaching paid_in_full.
 */

/** The smallest extra payment taken, unless less than this is owed. */
export const MIN_BALANCE_PAYMENT = 50;

/**
 * How a PaymentIntent is told apart in the webhook (metadata.kind).
 *
 * `deposit` and `full` are created at checkout (createBooking), `balance` from
 * the bookings page (startBalancePayment), and `installment` by the cron.
 * PaymentIntents created before this field existed have no kind: the handlers
 * treat those as a deposit, or as an installment when metadata.paymentId is
 * set, which is exactly what they were.
 */
export type PaymentKind = "deposit" | "full" | "balance" | "installment";

/** What the traveler picks at checkout. Anything else is rejected. */
export const PAYMENT_PLANS = ["deposit", "full"] as const;
export type PaymentPlan = (typeof PAYMENT_PLANS)[number];

export function isPaymentPlan(value: string): value is PaymentPlan {
  return (PAYMENT_PLANS as readonly string[]).includes(value);
}

export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * What is still owed on a booking: the price less every payment that has
 * actually cleared. Only `succeeded` counts. A `pending` row is a card form
 * someone may never submit, and a `scheduled` one is a promise, not money.
 * Automatic refunds are already in the figures (lib/overpayment.ts): a row
 * refunded in full is `refunded` and drops out here, and one refunded in part
 * records only what was kept.
 */
export function owedCents(total: number, payments: { status: string; amount: number }[]): number {
  const paid = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + toCents(p.amount), 0);
  return Math.max(0, toCents(total) - paid);
}

/** The floor for a custom amount: $50, or everything owed when that is less. */
export function minimumBalanceCents(owed: number): number {
  return Math.min(toCents(MIN_BALANCE_PAYMENT), owed);
}

/**
 * Parses what the traveler typed into the custom amount field.
 *
 * Accepts "250", "250.5", "$1,250.00". Rejects anything with more than two
 * decimal places rather than rounding it, because silently charging a figure
 * other than the one typed is worse than asking again.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

/**
 * The smallest charge Stripe will make in USD, in cents. Below it a
 * PaymentIntent is refused outright, so a balance or installment that small
 * can never be collected by card.
 */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export function validateBalanceAmount(
  cents: number,
  owed: number,
): { ok: true } | { ok: false; message: string } {
  if (owed <= 0) {
    return { ok: false, message: "Nothing is owed on this booking." };
  }
  // Only reachable on a booking already left owing a few cents by something
  // older than this check. Stripe cannot take it, so a person has to.
  if (owed < STRIPE_MIN_CHARGE_CENTS) {
    return {
      ok: false,
      message: `The ${formatAmount(fromCents(owed))} left is too small to pay by card. Get in touch and we will sort it out.`,
    };
  }
  const minimum = Math.max(minimumBalanceCents(owed), STRIPE_MIN_CHARGE_CENTS);
  if (cents < minimum) {
    return { ok: false, message: `The smallest payment we can take is ${formatAmount(fromCents(minimum))}.` };
  }
  if (cents > owed) {
    return { ok: false, message: `That is more than you owe. The balance is ${formatAmount(fromCents(owed))}.` };
  }
  // A payment that leaves a few cents behind leaves a balance nothing can ever
  // collect: Stripe will not charge it, so the installment for it would sit
  // failing until a person noticed. Refused here, before any money moves.
  const left = owed - cents;
  if (left > 0 && left < STRIPE_MIN_CHARGE_CENTS) {
    const largest = owed - STRIPE_MIN_CHARGE_CENTS;
    return {
      ok: false,
      message:
        largest >= minimum
          ? `That would leave ${formatAmount(fromCents(left))}, which is too small for us to charge later. Pay the full ${formatAmount(fromCents(owed))}, or no more than ${formatAmount(fromCents(largest))}.`
          : `That would leave ${formatAmount(fromCents(left))}, which is too small for us to charge later. Pay the full ${formatAmount(fromCents(owed))} instead.`,
    };
  }
  return { ok: true };
}

/**
 * Dollars, with cents only when there are any.
 *
 * lib/trips.ts formatPrice rounds to the dollar, which suits a tier price but
 * not a balance: "$1,000" on a button that takes $999.60 is a small lie on the
 * one screen where the figure has to be exact.
 */
export function formatAmount(amount: number): string {
  const cents = toCents(amount);
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
