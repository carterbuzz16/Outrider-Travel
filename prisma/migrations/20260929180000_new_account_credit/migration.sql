-- The new-account credit (lib/welcome-credit.ts): every account gets $100 off
-- one trip, for the first 24 hours after it is made. The owner's call, 29
-- September 2026, for visitors arriving from Instagram ads.
--
-- There is no credit table. Whether an account still has its credit is worked
-- out from two things that already exist: when the account was made
-- (auth.users.created_at) and whether any of its bookings has spent the credit.
-- This column is the second half: what a booking was given, so a paid booking
-- that carries a credit marks it spent, and the pay page can show it as a line.
--
-- As with discount codes and the pay-in-full discount, the credit is already
-- off bookings.total_amount (createBooking), so the deposit, the installments,
-- refunds and receipts read the price actually agreed without knowing a credit
-- existed. Zero on every booking made before this, and on every booking made
-- without one.

ALTER TABLE public.bookings
  ADD COLUMN credit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0
  CHECK (credit_amount >= 0);
