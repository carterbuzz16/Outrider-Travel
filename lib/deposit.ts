// No deposit field exists on Trip/Tier, so this is a single, easily-changed
// constant rather than something configurable per trip. The Terms page imports
// it, so changing it changes the legal text too: see the note at the top of
// app/(site)/terms/page.tsx.
//
// A flat $100 on every package since 13 October 2026 (Carter). It was 10% of
// the price ($160 to $380). A discount code no longer moves it: a code comes
// off the balance, so a chapter code still means $100 today.
export const DEPOSIT_AMOUNT = 100;

// Dollars off the tier price for paying the whole trip at booking. A flat
// amount, not a percentage, and only at checkout: paying the balance off
// early from the bookings page later earns nothing, because by then the
// booking's price is fixed. Zero turns it off, and every surface that
// mentions a saving hides it.
//
// There is no discount column anywhere. The discounted figure is what
// createBooking writes to bookings.total_amount, so the booking records the
// price actually agreed and everything downstream (receipts, the bookings
// page, admin totals) reads the right number without knowing a discount
// exists.
//
// Off since 8 October 2026 (Carter): with the chapter codes, the ambassador
// $100 and the comp codes, $100 for paying in full was one discount too many
// and nobody needed it to pay up front. Paying in full is still offered, at
// the tier price. Bookings made with it on keep their discounted total.
export const PAY_IN_FULL_DISCOUNT = 0;

// The whole price when that is less than the deposit, which only a discount
// code can make it: the balance is then nothing, and nothing is scheduled.
export function computeDepositAmount(price: number): number {
  return Math.min(DEPOSIT_AMOUNT, Math.max(0, Math.round(price * 100) / 100));
}

// Never below zero, however the constant and the tier price are set.
export function computePayInFullAmount(price: number): number {
  return Math.max(0, Math.round((price - Math.max(0, PAY_IN_FULL_DISCOUNT)) * 100) / 100);
}

// A price with a discount code's amount off (lib/discount-codes.ts), after any
// pay-in-full saving. Never below zero. At zero, createBooking makes the
// booking without a card (a comp code such as ELLISCOMPUSC); anything between
// zero and Stripe's 50 cents it refuses.
export function applyDiscount(price: number, discount: number): number {
  return Math.max(0, Math.round((price - Math.max(0, discount)) * 100) / 100);
}

// What paying in full actually saves on this price, which is less than the
// constant on a tier priced below it.
export function payInFullSaving(price: number): number {
  return Math.round((price - computePayInFullAmount(price)) * 100) / 100;
}

/*
 * Klarna (13 October 2026), for one payment that clears the whole price:
 * paying in full at booking (createBooking), or paying off everything still
 * owed after the $100 deposit, from the bookings page (startBalancePayment).
 * Never the deposit, an installment or a partial early payment: those intents
 * are card only, so the installments are always charged to a card and Klarna
 * never pays part of a balance a card charge then finishes.
 *
 * Klarna decides which of its options a shopper sees, by amount. In the US,
 * Pay in 4 runs to $2,000; above that it offers monthly financing instead,
 * which can carry interest (docs.stripe.com/payments/klarna, checked 13
 * October 2026). So the copy says "pay in 4" only on a price Pay in 4
 * covers, and "pay over time" on the rest. Carter chose that over one line
 * for every package, since Two to a Room and the penthouses are all over
 * $2,000. If Klarna moves the cap, this is the only number to change.
 */
export const KLARNA_PAY_IN_4_MAX = 2000;

/** "pay in 4 with Klarna", or "pay over time with Klarna" above Pay in 4's cap. */
export function klarnaPhrase(amount: number): string {
  return amount <= KLARNA_PAY_IN_4_MAX ? "pay in 4 with Klarna" : "pay over time with Klarna";
}

/**
 * The line that sits beside a price: what holds the spot and how the rest is
 * paid. `payments` is how many the balance is split into (two on Telluride,
 * lib/installments.ts) and `fullAmount` is what paying in full would charge.
 * It decides the Klarna words, and since the balance after the deposit is
 * less, a price inside Pay in 4's cap means both ways of using Klarna are too.
 *
 * Carter's words, 13 October 2026: "$100 holds your spot. The rest is split
 * into two payments before the trip, or pay in 4 with Klarna." Then the same
 * day, once Klarna could also pay off the balance after the deposit, "pay it
 * off" in place of "pay", so the line covers both.
 */
export function holdSpotLine(payments: number, fullAmount: number): string {
  const rest =
    payments > 1
      ? `The rest is split into ${payments === 2 ? "two" : payments} payments before the trip`
      : "The rest comes off in one payment before the trip";
  const klarna = fullAmount <= KLARNA_PAY_IN_4_MAX ? "in 4" : "over time";
  return `$${DEPOSIT_AMOUNT} holds your spot. ${rest}, or pay it off ${klarna} with Klarna.`;
}
