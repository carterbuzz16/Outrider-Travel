-- Codes that take a share of the price, codes for one package, codes one
-- person can use once, and the bookings such a code pays for in full
-- (7 October 2026).
--
-- Made for ELLISCOMPUSC: 100% off Four to a Room, deposit included, for two
-- people (Carter). Every code until now was a fixed amount off any package,
-- and a booking that came to $0 was refused, since Stripe cannot take a $0
-- charge and the only way there was a data-entry slip. Three new columns:
--
--   percent_off      a share of the package's list price instead of a fixed
--                    amount. Exactly one of amount and percent_off is set. A
--                    percent code is worked out on the tier price, before the
--                    pay-in-full saving, so what it takes off depends on the
--                    package only, never on the plan.
--   tier_name        the code works only on packages with this name
--                    (tiers.name, the team's working name: BASE is Four to a
--                    Room), on any trip. Null for every package, as before.
--   once_per_person  one use per account, so max_uses 2 means two different
--                    people. A booking counts against its owner once it is
--                    confirmed or money has moved on it; an unpaid checkout
--                    of their own does not.
--
-- A booking whose code leaves nothing to pay is confirmed without Stripe:
-- createBooking makes no card form for it, and the payment step asks only for
-- the terms, then calls confirm_free_booking, which moves it to paid_in_full
-- the way the webhook moves a paid one.
--
-- Safe for the code already deployed: the two functions it calls keep their
-- names and arguments, and a percent code has no amount, so a build from
-- before this migration reads it as an unknown code rather than applying it.

ALTER TABLE public.discount_codes ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE public.discount_codes
  ADD COLUMN percent_off SMALLINT CHECK (percent_off BETWEEN 1 AND 100),
  ADD COLUMN tier_name TEXT,
  ADD COLUMN once_per_person BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT discount_codes_amount_or_percent CHECK ((amount IS NULL) <> (percent_off IS NULL));

-- What a code takes off one package, whether or not it can be used right now:
-- the fixed amount, or its share of the tier price. NULL when the code is for
-- another package, or is a percent code asked without a package (it has no
-- figure until it has a price). Tier names compare as lib/tier-display.ts
-- compares them: trimmed, single-spaced, upper case.
CREATE OR REPLACE FUNCTION public.discount_code_value(p_code TEXT, p_tier UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN c.percent_off IS NULL THEN c.amount
    ELSE round(t.price * c.percent_off / 100.0, 2)
  END
  FROM public.discount_codes c
  LEFT JOIN public.tiers t ON t.id = p_tier
  WHERE c.code = p_code
    AND (c.percent_off IS NULL OR t.id IS NOT NULL)
    AND (
      c.tier_name IS NULL
      OR upper(regexp_replace(btrim(t.name), '\s+', ' ', 'g'))
         = upper(regexp_replace(btrim(c.tier_name), '\s+', ' ', 'g'))
    );
$$;

-- Whether this person has already spent a use of the code on another booking:
-- one confirmed, or one money has moved on. Their own unpaid checkouts do not
-- count; createBooking lets those go before a new one claims the code, and
-- confirm_free_booking asks again at the end.
CREATE OR REPLACE FUNCTION public.discount_code_used_by(p_code TEXT, p_user UUID, p_exclude UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discount_redemptions r
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE r.code = p_code
      AND b.user_id = p_user
      AND (p_exclude IS NULL OR b.id <> p_exclude)
      AND (
        b.status IN ('deposit_paid', 'paid_in_full')
        OR EXISTS (
          SELECT 1 FROM public.payments p
          WHERE p.booking_id = b.id AND p.status IN ('succeeded', 'refunded')
        )
      )
  );
$$;

-- Now asked of a package (p_tier). Without one it answers as before for a
-- fixed code on every package, which is what the liveness checks (early
-- access, the $100 offer) ask; a percent or one-package code then answers
-- NULL. Replaced rather than overloaded, so a call with two named arguments
-- still finds exactly one function.
DROP FUNCTION IF EXISTS public.discount_code_amount(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.discount_code_amount(p_code TEXT, p_user UUID DEFAULT NULL, p_tier UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.discount_code_value(c.code, p_tier)
  FROM public.discount_codes c
  WHERE c.code = p_code
    AND c.active
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND public.discount_code_uses(c.code, p_user, NULL) < c.max_uses
    AND NOT (c.once_per_person AND p_user IS NOT NULL AND public.discount_code_used_by(c.code, p_user, NULL));
$$;

-- As in discount_code_hardening, with the amount worked out for the booking's
-- own package, a code for another package refused, and a one-per-person code
-- refused to someone who has already used it.
CREATE OR REPLACE FUNCTION public.claim_discount_code(p_code TEXT, p_booking UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.discount_codes%ROWTYPE;
  b public.bookings%ROWTYPE;
  off NUMERIC;
  held NUMERIC;
BEGIN
  SELECT * INTO c FROM public.discount_codes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND OR NOT c.active OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;
  off := public.discount_code_value(c.code, b.tier_id);
  IF off IS NULL THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;

  SELECT amount INTO held FROM public.discount_redemptions
  WHERE booking_id = p_booking AND code = c.code;
  IF FOUND THEN
    RETURN held;
  END IF;

  IF public.discount_code_uses(c.code, NULL, p_booking) >= c.max_uses THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;
  IF c.once_per_person AND public.discount_code_used_by(c.code, b.user_id, p_booking) THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  DELETE FROM public.discount_redemptions WHERE booking_id = p_booking;
  INSERT INTO public.discount_redemptions (code, booking_id, amount)
  VALUES (c.code, p_booking, off);
  RETURN off;
END;
$$;

-- A stale checkout's code is also lost once its owner has used a
-- one-per-person code on another booking in the meantime.
CREATE OR REPLACE FUNCTION public.discount_hold_lost(p_booking UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discount_redemptions r
    JOIN public.discount_codes c ON c.code = r.code
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE r.booking_id = p_booking
      AND (
        public.discount_code_uses(r.code, NULL, p_booking) >= c.max_uses
        OR (c.once_per_person AND public.discount_code_used_by(r.code, b.user_id, p_booking))
      )
  );
$$;

-- Confirms a booking its code pays for in full: pending and $0 becomes
-- paid_in_full, as settleCheckoutPayment does for a paid one. The last check
-- before the place is the traveler's, so the code is checked again under its
-- lock, the same lock a claim takes, and two people confirming the last use at
-- once are served one after the other. The code row is locked before the
-- booking row, the order a claim takes them in.
--
-- Returns true when this call confirmed it, false when it was already
-- confirmed (a second press). Raises free_booking_invalid for a booking that
-- is not a pending $0 booking holding a code, discount_code_invalid for a code
-- switched off or expired since, and discount_code_used for one that has gone
-- to others, or to this person on another booking, since it was claimed.
CREATE OR REPLACE FUNCTION public.confirm_free_booking(p_booking UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  held TEXT;
  c public.discount_codes%ROWTYPE;
  b public.bookings%ROWTYPE;
BEGIN
  SELECT code INTO held FROM public.discount_redemptions WHERE booking_id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;
  SELECT * INTO c FROM public.discount_codes WHERE code = held FOR UPDATE;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND OR b.total_amount <> 0 THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;
  IF b.status = 'paid_in_full' THEN
    RETURN false;
  END IF;
  IF b.status <> 'pending'
     OR NOT EXISTS (SELECT 1 FROM public.discount_redemptions WHERE booking_id = p_booking AND code = c.code) THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;

  IF NOT c.active OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;
  IF public.discount_code_uses(c.code, NULL, p_booking) >= c.max_uses
     OR (c.once_per_person AND public.discount_code_used_by(c.code, b.user_id, p_booking)) THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  UPDATE public.bookings SET status = 'paid_in_full' WHERE id = p_booking;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.discount_code_value(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_code_used_by(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_code_amount(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_discount_code(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_hold_lost(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_free_booking(UUID) FROM PUBLIC, anon, authenticated;
