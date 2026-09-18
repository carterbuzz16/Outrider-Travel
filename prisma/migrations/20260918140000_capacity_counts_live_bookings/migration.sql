-- Capacity counts live bookings only, not abandoned checkouts.
--
-- check_tier_capacity counted every booking that was not cancelled, and a
-- booking is inserted as `pending` the moment someone opens checkout. A
-- checkout abandoned at the card form stayed pending forever, so it held its
-- bed forever: enough of them and a tier read as sold out with nobody on it.
--
-- A bed is now held by the same bookings that hold a penthouse claim:
--   * deposit_paid or paid_in_full, or
--   * pending and created within the last 30 minutes.
-- One definition for both checks, and for lib/tier-claims.ts
-- (activeBookingFilter), lib/trips.ts (public availability) and
-- lib/penthouse.ts (CLAIM_PENDING_WINDOW_MS). Keep them in step.
--
-- The hole this opens: a pending booking older than 30 minutes no longer
-- holds its bed, but its card form still works. Paying it could overfill the
-- tier, or put a second group into a penthouse. The app closes that before the
-- card is confirmed (lib/stale-checkout.ts, called from the pay page and from
-- acceptTermsForBooking): a stale checkout whose bed or penthouse has gone is
-- cancelled, PaymentIntent first. See that file for what is left.
--
-- Everything else is exactly as in add_group_exclusive_tiers: the same
-- advisory lock, taken first, and the same claim check.

CREATE OR REPLACE FUNCTION public.check_tier_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  capacity INTEGER;
  exclusive BOOLEAN;
  booked_count INTEGER;
  claim_code TEXT;
  claim_found BOOLEAN;
BEGIN
  -- Held until the inserting transaction ends. Every check below runs after
  -- it, so it sees any booking a concurrent insert for this tier committed.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.tier_id::text));

  SELECT max_capacity, group_exclusive INTO capacity, exclusive
  FROM public.tiers WHERE id = NEW.tier_id;

  IF exclusive THEN
    -- created_at is TIMESTAMP (no time zone) defaulting to CURRENT_TIMESTAMP,
    -- so it is compared with LOCALTIMESTAMP, the same clock it was written by.
    SELECT b.group_code, true INTO claim_code, claim_found
    FROM public.bookings b
    WHERE b.tier_id = NEW.tier_id
      AND (
        b.status IN ('deposit_paid', 'paid_in_full')
        OR (b.status = 'pending' AND b.created_at > LOCALTIMESTAMP - INTERVAL '30 minutes')
      )
    ORDER BY b.created_at ASC, b.id ASC
    LIMIT 1;

    IF claim_found AND (
      claim_code IS NULL
      OR NEW.group_code IS NULL
      OR claim_code <> NEW.group_code
    ) THEN
      RAISE EXCEPTION 'tier_claimed' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF capacity IS NULL THEN
    RETURN NEW;
  END IF;

  -- Paid, or mid-checkout within the window: the same rows as the claim.
  SELECT count(*) INTO booked_count
  FROM public.bookings b
  WHERE b.tier_id = NEW.tier_id
    AND (
      b.status IN ('deposit_paid', 'paid_in_full')
      OR (b.status = 'pending' AND b.created_at > LOCALTIMESTAMP - INTERVAL '30 minutes')
    );

  IF booked_count >= capacity THEN
    RAISE EXCEPTION 'tier_at_capacity' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE keeps the existing grants; restated so the file reads
-- complete on its own. The enforce_tier_capacity trigger is unchanged.
REVOKE ALL ON FUNCTION public.check_tier_capacity() FROM PUBLIC, anon, authenticated;
