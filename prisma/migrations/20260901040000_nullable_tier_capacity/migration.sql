-- NULL max_capacity means genuinely uncapped (e.g. a shared-lodging tier
-- with no hard room limit), not a large sentinel number — a sentinel is
-- always either wrong once real demand exceeds it or misleading to anyone
-- reading the data later.
ALTER TABLE "tiers" ALTER COLUMN "max_capacity" DROP NOT NULL;

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

  IF capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO booked_count
  FROM public.bookings
  WHERE tier_id = NEW.tier_id AND status != 'cancelled';

  IF booked_count >= capacity THEN
    RAISE EXCEPTION 'tier_at_capacity' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
