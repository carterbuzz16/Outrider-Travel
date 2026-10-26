-- More to the /ambassador application (26 October 2026): year in school, and
-- two short answers Carter asked for, why they want to do it and what makes
-- them a good fit.
--
--   year  'freshman', 'sophomore', 'junior' or 'senior'.
--   why   "Why do you want to do this?"   At most 300 characters.
--   fit   "What makes you a good fit?"    At most 300 characters.
--
-- Nullable: the applications from before the questions existed have none, and
-- null keeps meaning "never asked". The form requires all three from now on.
-- Additive and guarded, so re-running it is a no-op. The table-level REVOKE
-- from the first migration covers these columns too.

ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS why  TEXT,
  ADD COLUMN IF NOT EXISTS fit  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_year') THEN
    ALTER TABLE public.ambassador_applications
      ADD CONSTRAINT ambassador_applications_year
      CHECK (year IS NULL OR year IN ('freshman', 'sophomore', 'junior', 'senior'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_answer_lengths') THEN
    ALTER TABLE public.ambassador_applications
      ADD CONSTRAINT ambassador_applications_answer_lengths
      CHECK (
        (why IS NULL OR char_length(why) BETWEEN 1 AND 300)
        AND (fit IS NULL OR char_length(fit) BETWEEN 1 AND 300)
      );
  END IF;
END
$$;
