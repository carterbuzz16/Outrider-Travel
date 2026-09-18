-- Group-exclusive tiers: the penthouses.
--
-- The top package is two penthouses per departure ("PENTHOUSE 702" and
-- "PENTHOUSE 830", 8 beds each). A whole friend group buys a penthouse out:
-- once one person reserves it, it is taken for everyone else, unless they
-- book with that first person's group code, in which case they join them (up
-- to the tier's max_capacity, which the capacity check below still enforces).
--
-- Enforced here, in the same trigger as capacity, rather than only in
-- createBooking: two groups checking out for the same penthouse at the same
-- moment would both pass an application-side "is it claimed?" read. The
-- trigger already serialises every insert for a tier on a transaction-scoped
-- advisory lock keyed on tier_id, so doing the claim check after that same
-- lock means the second group's insert waits for the first to commit and then
-- sees its row. One function, one lock: there is no second lock to take in a
-- different order.
--
-- An ACTIVE CLAIM is a booking on the tier that is either
--   * deposit_paid or paid_in_full, or
--   * pending and created within the last 30 minutes.
-- The window means an abandoned checkout does not lock a penthouse forever,
-- while two groups still cannot both be mid-checkout for it. The claim belongs
-- to the group_code of the EARLIEST active booking (created_at, then id).
--
-- NULL group codes: createBooking always assigns one (resolveGroupCode makes a
-- fresh code when none is entered), so a NULL here means a row written some
-- other way. A NULL can never prove membership of a group, so a NULL on
-- either side counts as a different group and the insert is refused.
--
-- lib/tier-claims.ts (getTierClaims) and lib/penthouse.ts (claimFromRows,
-- CLAIM_PENDING_WINDOW_MS) mirror this definition for display and for the
-- pre-insert check in createBooking; keep them in step.

ALTER TABLE "tiers" ADD COLUMN "group_exclusive" BOOLEAN NOT NULL DEFAULT false;

-- The penthouse tiers, if they already exist. Anything else stays as it is;
-- the admin can flip the flag per tier from /admin/trips/<id>.
UPDATE "tiers" SET "group_exclusive" = true WHERE upper(trim("name")) LIKE 'PENTHOUSE %';

-- The two penthouse emails, once per recipient booking: "the penthouse is
-- full" and "two days left to fill it". Each send first claims its booking with
-- a conditional UPDATE ... WHERE <col> IS NULL RETURNING id, so the webhook,
-- the stripe sync and the daily cron racing each other still send each email
-- once; a failed send puts the column back to NULL. See lib/email/penthouse.ts.
ALTER TABLE "bookings"
  ADD COLUMN "penthouse_full_email_sent_at" TIMESTAMPTZ,
  ADD COLUMN "penthouse_reminder_email_sent_at" TIMESTAMPTZ;

-- bookings had no index on tier_id at all, so both the capacity count and the
-- claim lookup below scanned every booking on every insert. (tier_id,
-- created_at) serves both, and the foreign key to tiers. The table is small;
-- a plain CREATE INDEX (Prisma migrations run in a transaction, so not
-- CONCURRENTLY) holds a write lock on bookings only briefly.
CREATE INDEX "bookings_tier_id_created_at_idx" ON "bookings"("tier_id", "created_at");

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

  SELECT count(*) INTO booked_count
  FROM public.bookings
  WHERE tier_id = NEW.tier_id AND status != 'cancelled';

  IF booked_count >= capacity THEN
    RAISE EXCEPTION 'tier_at_capacity' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE keeps the existing grants, but restate the revoke so this
-- file reads complete on its own. The enforce_tier_capacity trigger already
-- points at this function and is unchanged.
REVOKE ALL ON FUNCTION public.check_tier_capacity() FROM PUBLIC, anon, authenticated;
