-- The applicant's email on /ambassador applications (27 October 2026,
-- Carter: "I need to get emails in the ambassador application too").
--
--   email  Lowercased, at most 254 characters (the longest an address can
--          be). The server checks it with the waitlist's own rule
--          (lib/waitlist-signup.ts); this only refuses what is plainly not
--          an address.
--
-- Nullable: the applications from before the form asked have none. The form
-- requires it from now on. Additive and guarded, so re-running it is a no-op.
-- The table-level REVOKE from the first migration covers this column too.

ALTER TABLE public.ambassador_applications
  ADD COLUMN IF NOT EXISTS email TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_email') THEN
    ALTER TABLE public.ambassador_applications
      ADD CONSTRAINT ambassador_applications_email
      CHECK (
        email IS NULL
        OR (char_length(email) <= 254 AND email = lower(email) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
      );
  END IF;
END
$$;
