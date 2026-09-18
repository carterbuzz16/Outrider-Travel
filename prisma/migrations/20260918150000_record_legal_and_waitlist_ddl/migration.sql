-- Records DDL that exists on the live database but was never written down as
-- a migration, so a fresh environment built from this folder matches it.
--
-- Every statement is guarded, and the whole file is a no-op on the live
-- database, where all of it already exists:
--   * legal_acceptances: RLS on; one SELECT policy for authenticated, own rows
--     only; no INSERT or UPDATE grant to anon or authenticated (rows are
--     written by the service role, lib/legal-acceptance.ts).
--   * waitlist_signups: RLS on, no policies; unsubscribe_token defaulting to
--     gen_random_uuid() with the unique index
--     waitlist_signups_unsubscribe_token_key; unsubscribed_at.
-- Indexes and constraints are created only together with the table, or only
-- when no index of the verified name exists, so none is ever duplicated on a
-- database that has them under their live names.

-- -- legal_acceptances ------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.legal_acceptances') IS NULL THEN
    CREATE TABLE public.legal_acceptances (
      id               UUID         NOT NULL DEFAULT gen_random_uuid(),
      booking_id       UUID         NOT NULL,
      user_id          UUID         NOT NULL,
      -- "terms" | "assumption-of-risk", matching the slugs in lib/legal.ts
      document_slug    TEXT         NOT NULL,
      -- The exact version shown, so the text accepted can be reproduced later.
      document_version TEXT         NOT NULL,
      accepted_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address       TEXT,
      user_agent       TEXT,
      CONSTRAINT legal_acceptances_pkey PRIMARY KEY (id),
      CONSTRAINT legal_acceptances_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES public.bookings (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT legal_acceptances_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX legal_acceptances_booking_id_document_slug_key
      ON public.legal_acceptances (booking_id, document_slug);
    CREATE INDEX legal_acceptances_booking_id_idx ON public.legal_acceptances (booking_id);
    CREATE INDEX legal_acceptances_user_id_idx ON public.legal_acceptances (user_id);
  END IF;
END
$$;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Evidence is append-only and written by the service role; nobody writes it
-- through the API. Only INSERT and UPDATE are revoked, which is exactly the
-- live state, so this changes nothing there. SELECT stays for the policy.
REVOKE INSERT, UPDATE ON public.legal_acceptances FROM anon, authenticated;

-- A traveler may read their own acceptances. Created only when the table has
-- no SELECT policy at all, so the live policy (whatever its name) is left
-- alone and never doubled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'legal_acceptances' AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view own legal acceptances"
      ON public.legal_acceptances
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END
$$;

-- -- waitlist_signups ---------------------------------------------------------

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Restated so a database where the column already existed without it ends up
-- the same. Setting the same default again is a no-op.
ALTER TABLE public.waitlist_signups
  ALTER COLUMN unsubscribe_token SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF to_regclass('public.waitlist_signups_unsubscribe_token_key') IS NULL THEN
    ALTER TABLE public.waitlist_signups
      ADD CONSTRAINT waitlist_signups_unsubscribe_token_key UNIQUE (unsubscribe_token);
  END IF;
END
$$;

-- RLS on and no policies: every read and write goes through the service role
-- (app/waitlist-actions.ts, lib/unsubscribe.ts). Already on live.
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
