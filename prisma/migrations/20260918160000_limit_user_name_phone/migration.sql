-- Length limits on the two free-text fields a traveler writes to their own
-- users row. The app trims and checks them, but the database is the only
-- place a limit holds for every writer, and an unbounded TEXT column is room
-- for a megabyte of junk in every email and admin page that prints a name.
--
-- NOT VALID: the constraint applies to every INSERT and UPDATE from now on,
-- but existing rows are not scanned, so this cannot fail on a row already
-- over the limit (the live data could not be checked when this was written).
-- Once someone has confirmed there are none:
--
--   SELECT id FROM public.users
--   WHERE char_length(name) > 120 OR char_length(phone) > 40;
--
-- run VALIDATE CONSTRAINT for each (it takes only a SHARE UPDATE EXCLUSIVE
-- lock, so it does not block reads or writes):
--
--   ALTER TABLE public.users VALIDATE CONSTRAINT users_name_length;
--   ALTER TABLE public.users VALIDATE CONSTRAINT users_phone_length;
--
-- Guarded so running this twice is harmless.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_name_length' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_name_length CHECK (name IS NULL OR char_length(name) <= 120) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_phone_length' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_phone_length CHECK (phone IS NULL OR char_length(phone) <= 40) NOT VALID;
  END IF;
END
$$;
