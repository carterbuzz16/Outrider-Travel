-- "Chapter or org" is optional on /ambassador from 27 October 2026 (Carter:
-- people come from Instagram, and not everyone is in a chapter), so a blank
-- answer is stored as null.
--
-- The length check from the first migration (char_length(chapter) BETWEEN 1
-- AND 120) still holds for every non-null value; a null passes it, as a CHECK
-- does. Dropping NOT NULL twice is not an error, so re-running this is a
-- no-op.

ALTER TABLE public.ambassador_applications
  ALTER COLUMN chapter DROP NOT NULL;
