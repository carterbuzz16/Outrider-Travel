// No deposit-percentage field exists on Trip/Tier, so this is a single,
// easily-changed constant rather than something configurable per trip. The
// Terms page imports it, so changing it changes the legal text too: see the
// note at the top of app/(site)/terms/page.tsx.
export const DEPOSIT_PERCENTAGE = 0.1;

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
export const PAY_IN_FULL_DISCOUNT = 100;

export function computeDepositAmount(price: number): number {
  return Math.round(price * DEPOSIT_PERCENTAGE * 100) / 100;
}

// Never below zero, however the constant and the tier price are set.
export function computePayInFullAmount(price: number): number {
  return Math.max(0, Math.round((price - Math.max(0, PAY_IN_FULL_DISCOUNT)) * 100) / 100);
}

// What paying in full actually saves on this price, which is less than the
// constant on a tier priced below it.
export function payInFullSaving(price: number): number {
  return Math.round((price - computePayInFullAmount(price)) * 100) / 100;
}
