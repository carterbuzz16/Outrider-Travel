-- A code whose discount ends while the code keeps working (8 October 2026).
--
-- Ambassador codes (CAMILLE first) take $100 off through 22 October, and
-- every booking made with one is how its ambassador is paid. expires_at ends a
-- code outright, so after it nobody could enter the code and the ambassador's
-- later sales would go uncredited. discount_ends_at ends only the money off:
-- after it the code still checks out and is still claimed onto the booking,
-- at $0. Null, as for every existing code, changes nothing.
--
-- Only discount_code_value changes, and the redemption amount may now be
-- zero. Everything that prices or claims a code goes through that function,
-- so discount_code_amount and claim_discount_code return 0 after the date
-- without being touched. CREATE OR REPLACE keeps the function's existing
-- grants (service role only).

ALTER TABLE public.discount_codes ADD COLUMN discount_ends_at TIMESTAMPTZ;

ALTER TABLE public.discount_redemptions DROP CONSTRAINT discount_redemptions_amount_check;
ALTER TABLE public.discount_redemptions ADD CONSTRAINT discount_redemptions_amount_check CHECK (amount >= 0);

CREATE OR REPLACE FUNCTION public.discount_code_value(p_code TEXT, p_tier UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN c.discount_ends_at IS NOT NULL AND c.discount_ends_at <= now() THEN 0
    WHEN c.percent_off IS NULL THEN c.amount
    ELSE round(t.price * c.percent_off / 100.0, 2)
  END
  FROM public.discount_codes c
  LEFT JOIN public.tiers t ON t.id = p_tier
  WHERE c.code = p_code
    AND (c.percent_off IS NULL OR t.id IS NOT NULL)
    AND (c.tier_id IS NULL OR c.tier_id = p_tier)
    AND (
      c.tier_name IS NULL
      OR upper(regexp_replace(btrim(t.name), '\s+', ' ', 'g'))
         = upper(regexp_replace(btrim(c.tier_name), '\s+', ' ', 'g'))
    );
$$;
