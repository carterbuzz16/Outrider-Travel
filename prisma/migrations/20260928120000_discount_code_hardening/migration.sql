-- Discount codes, hardened before booking opens to everyone (security review,
-- 27 September 2026). Two changes to the discount_codes migration:
--
-- 1. An abandoned checkout no longer holds a code forever. A pending booking
--    counted as a use for as long as it stayed pending, and nothing ever moves
--    a pending booking on by itself, so anyone who got hold of a winner's link
--    could open checkout, walk away, and leave the winner told "already used".
--    A pending booking now counts only inside the same 30-minute hold the
--    capacity trigger uses (capacity_counts_live_bookings), compared the same
--    way (created_at is a UTC timestamp without a zone, so LOCALTIMESTAMP).
--    A stale checkout that comes back to pay is checked again first
--    (discount_hold_lost, called by recheckStaleCheckout), and let go if its
--    code has gone to someone else in the meantime.
--
-- 2. Codes must be at least 8 characters, so a hand-made short code cannot be
--    guessed. The two live codes are 11.

ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_code_check;
ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_code_check CHECK (code ~ '^[A-Z0-9]{8,32}$');

-- p_exclude: a booking to leave out of the count, for asking "is this code
-- still this booking's?" without the booking counting against itself.
DROP FUNCTION IF EXISTS public.discount_code_uses(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.discount_code_uses(p_code TEXT, p_user UUID DEFAULT NULL, p_exclude UUID DEFAULT NULL)
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
    AND (p_exclude IS NULL OR b.id <> p_exclude)
    AND (
      -- Money has moved: spent, whatever happened to the booking after.
      EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.booking_id = b.id AND p.status IN ('succeeded', 'refunded')
      )
      OR b.status IN ('deposit_paid', 'paid_in_full')
      -- A checkout in progress, inside its hold, and not the asker's own.
      OR (
        b.status = 'pending'
        AND b.created_at > LOCALTIMESTAMP - INTERVAL '30 minutes'
        AND NOT (p_user IS NOT NULL AND b.user_id = p_user)
      )
    );
$$;

-- Unchanged apart from calling the new signature.
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
    AND public.discount_code_uses(c.code, p_user, NULL) < c.max_uses;
$$;

-- Unchanged apart from not counting the claiming booking against itself.
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

  IF public.discount_code_uses(c.code, NULL, p_booking) >= c.max_uses THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  DELETE FROM public.discount_redemptions WHERE booking_id = p_booking;
  INSERT INTO public.discount_redemptions (code, booking_id, amount)
  VALUES (c.code, p_booking, c.amount);
  RETURN c.amount;
END;
$$;

-- Whether a booking's code has been used up by other bookings since it was
-- claimed: true only for a booking holding a code whose other live uses now
-- fill it. A booking with no code, or whose code is still its own, is false.
-- Asked of a stale checkout before its card is confirmed, the one moment a
-- booking that stopped counting as a use could start counting again.
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
    WHERE r.booking_id = p_booking
      AND public.discount_code_uses(r.code, NULL, p_booking) >= c.max_uses
  );
$$;

REVOKE ALL ON FUNCTION public.discount_code_uses(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_code_amount(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_discount_code(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discount_hold_lost(UUID) FROM PUBLIC, anon, authenticated;
