-- Enforce tiers.max_capacity at the database level, not just in app code,
-- so it holds regardless of which client performs the insert.
--
-- A plain "count existing bookings, then insert" check in application code
-- has a race: two concurrent requests can both pass the count check before
-- either commits, overselling the last slot. Taking a transaction-scoped
-- advisory lock keyed on tier_id serializes concurrent inserts for the
-- *same* tier (inserts for different tiers are unaffected), so the count
-- below is always accurate when it runs.
CREATE OR REPLACE FUNCTION public.check_tier_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  capacity INTEGER;
  booked_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.tier_id::text));

  SELECT max_capacity INTO capacity FROM public.tiers WHERE id = NEW.tier_id;

  SELECT count(*) INTO booked_count
  FROM public.bookings
  WHERE tier_id = NEW.tier_id AND status != 'cancelled';

  IF booked_count >= capacity THEN
    RAISE EXCEPTION 'tier_at_capacity' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_tier_capacity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_tier_capacity
  BEFORE INSERT ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION public.check_tier_capacity();
