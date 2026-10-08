-- A code for one trip's package (7 October 2026).
--
-- tier_name (free_package_codes) limits a code to a package by name on every
-- trip, and both Telluride departures call Four to a Room BASE. Cece's comp
-- is for December's Four to a Room only, so a code can now name the tier row
-- itself. Null for any tier, as before; set alongside tier_name or instead
-- of it.
--
-- Only discount_code_value changes. Everything that prices or claims a code
-- goes through it with the booking's own tier, so no app code changes.
-- CREATE OR REPLACE keeps the function's existing grants (service role only).

ALTER TABLE public.discount_codes ADD COLUMN tier_id UUID REFERENCES public.tiers (id);

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
    AND (c.tier_id IS NULL OR c.tier_id = p_tier)
    AND (
      c.tier_name IS NULL
      OR upper(regexp_replace(btrim(t.name), '\s+', ' ', 'g'))
         = upper(regexp_replace(btrim(c.tier_name), '\s+', ' ', 'g'))
    );
$$;
