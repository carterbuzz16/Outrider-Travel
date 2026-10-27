-- Codes worth $0 that only record who sent a booking (27 October 2026).
--
-- Ambassador codes (STEIN, DETHLEFS and the rest, lib/discount-codes.ts) take
-- nothing off. A booking made with one is credited to its ambassador through
-- the discount_redemptions row, the same record every other code leaves, so
-- the code has to be claimable at $0 and the redemption has to be writable
-- at $0. Two checks stopped both:
--
--   discount_codes_amount_check        amount > 0, so the code could not be
--                                      inserted at all.
--   discount_redemptions_amount_check  amount > 0, so claim_discount_code
--                                      raised a check violation at Continue,
--                                      after the booking page had already
--                                      shown the code as applied.
--
-- The second was meant to go with discount_ends_at (20261008120000), which
-- has not been applied to the live database; that migration drops and adds
-- the same constraint by name, so it still runs cleanly after this one.
--
-- Nothing else changes. amount_or_percent still wants exactly one of amount
-- and percent_off, the code-format check is untouched, and percent_off stays
-- 1 to 100, so a $0 code is always amount = 0 with percent_off null. The
-- functions need no change: discount_code_value returns the amount as it
-- stands, discount_code_amount returns 0 (a usable code, not NULL), and
-- claim_discount_code writes the 0 it was given.
--
-- Safe to run twice: each constraint is dropped if it exists and added back.

ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_amount_check;
ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_amount_check CHECK (amount >= 0);

ALTER TABLE public.discount_redemptions DROP CONSTRAINT IF EXISTS discount_redemptions_amount_check;
ALTER TABLE public.discount_redemptions ADD CONSTRAINT discount_redemptions_amount_check CHECK (amount >= 0);
