-- Discount codes: a fixed amount off a booking, typed at checkout or carried
-- in the booking link as ?code= (lib/discount-codes.ts). Made for giveaway
-- prizes ("$500 off the trip"), so a code is single-use unless it says
-- otherwise, and codes are added by the team in SQL, never by a visitor.
--
-- As with the pay-in-full discount, the discounted figure is what createBooking
-- writes to bookings.total_amount, so everything downstream (the deposit, the
-- installments, refunds, receipts) reads the price actually agreed without
-- knowing a code existed. The redemption row is the record of which code took
-- what off which booking.

CREATE TABLE public.discount_codes (
  -- Upper case letters and digits only, so what is read out over a text is
  -- what gets typed. lib/discount-codes.ts normalizes input the same way.
  code        TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{3,32}$'),
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  max_uses    INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  -- Who it was for and why, for the team. Never shown to a traveler.
  note        TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.discount_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL REFERENCES public.discount_codes (code),
  -- One code per booking. A pending booking deleted because its checkout was
  -- abandoned takes its redemption with it, which frees the code.
  booking_id  UUID NOT NULL UNIQUE REFERENCES public.bookings (id) ON DELETE CASCADE,
  -- The amount taken off, copied from the code when it was claimed, so a code
  -- edited later never changes what an existing booking was given.
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discount_redemptions_code_idx ON public.discount_redemptions (code);

-- RLS on and no policies: every read and write goes through the service role,
-- like bookings and payments. A browser must never be able to list codes.
REVOKE ALL ON public.discount_codes, public.discount_redemptions FROM anon, authenticated;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

-- How many times a code has been used. A redemption counts while its booking
-- is alive (pending or paid) and forever once any money has moved on it, so a
-- paid booking that is later cancelled still spent the code. A checkout that
-- was abandoned before paying (cancelled, nothing succeeded) does not count.
--
-- p_user's own unpaid pending bookings are left out: a traveler who opened
-- checkout with the code, walked away and came back is not told their own
-- abandoned checkout has used it. createBooking releases that checkout before
-- it claims the code again, so the code still ends up on one booking.
CREATE OR REPLACE FUNCTION public.discount_code_uses(p_code TEXT, p_user UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::INTEGER
  FROM public.discount_redemptions r
  JOIN public.bookings b ON b.id = r.booking_id
  WHERE r.code = p_code
    AND (
      EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.booking_id = b.id AND p.status IN ('succeeded', 'refunded')
      )
      OR (
        b.status <> 'cancelled'
        AND NOT (p_user IS NOT NULL AND b.user_id = p_user AND b.status = 'pending')
      )
    );
$$;

-- The amount a code takes off, or NULL if it cannot be used right now
-- (unknown, switched off, expired, or used up). A read for showing prices; the
-- claim below is what actually decides.
CREATE OR REPLACE FUNCTION public.discount_code_amount(p_code TEXT, p_user UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.amount
  FROM public.discount_codes c
  WHERE c.code = p_code
    AND c.active
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND public.discount_code_uses(c.code, p_user) < c.max_uses;
$$;

-- Puts a code on a booking, race-safely. The code's row is locked for the
-- length of the claim, so two checkouts claiming the last use at the same
-- moment are served one after the other and the second finds it used. Raises
-- discount_code_invalid or discount_code_used; returns the amount taken off.
--
-- Idempotent for a booking that already holds this code (a second press, or a
-- carried checkout re-priced). A booking holding a different code has that
-- one dropped first: one code per booking.
CREATE OR REPLACE FUNCTION public.claim_discount_code(p_code TEXT, p_booking UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.discount_codes%ROWTYPE;
  held NUMERIC;
BEGIN
  SELECT * INTO c FROM public.discount_codes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND OR NOT c.active OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;

  SELECT amount INTO held FROM public.discount_redemptions
  WHERE booking_id = p_booking AND code = c.code;
  IF FOUND THEN
    RETURN held;
  END IF;

  IF public.discount_code_uses(c.code) >= c.max_uses THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  DELETE FROM public.discount_redemptions WHERE booking_id = p_booking;
  INSERT INTO public.discount_redemptions (code, booking_id, amount)
  VALUES (c.code, p_booking, c.amount);
  RETURN c.amount;
END;
$$;

REVOKE ALL ON FUNCTION public.discount_code_uses(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_code_amount(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_discount_code(TEXT, UUID) FROM PUBLIC, anon, authenticated;
