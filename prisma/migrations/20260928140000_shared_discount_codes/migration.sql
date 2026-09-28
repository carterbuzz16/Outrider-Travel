-- Shared discount codes may be short (28 September 2026).
--
-- discount_code_hardening made every code at least 8 characters so a
-- hand-made single-use prize code could not be guessed and spent before its
-- winner got to it. A code made to be shared, like a chapter code handed round
-- a group chat, is not protected by its length: it is meant to be passed on,
-- and a name like PHIDELT is no easier to guess than PHIDELTA. So the 8
-- character floor now applies to single-use codes only; a code with more than
-- one use may be as short as the original 3.
--
-- The rest of the hardening (the 30-minute hold, discount_hold_lost, the
-- per-network rate limits on checking and claiming codes) is unchanged.

ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_code_check;
ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_code_check CHECK (
    code ~ '^[A-Z0-9]{8,32}$'
    OR (max_uses > 1 AND code ~ '^[A-Z0-9]{3,32}$')
  );
