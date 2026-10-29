-- The ambassador portal (29 October 2026): /ambassador/dashboard.
--
-- Builds on referrals_and_ambassadors. Four things:
--
--   1. ambassadors gains the columns the portal needs: the account an
--      ambassador signs in with, their chapter, a program status, when they
--      accepted the agreement, which program they belong to, whether they
--      hide their name on the leaderboard, and the departure they picked once
--      they earned a free trip.
--   2. ambassador_announcements: short plain-text posts from the team, shown
--      at the top of the dashboard.
--   3. legal_acceptances can hold an acceptance that belongs to no booking,
--      for the ambassador agreement, and only for that.
--   4. a private Storage bucket for the toolkit graphics.
--
-- Every table here is read and written by the server with the service role
-- only, like ambassadors and discount_codes already are: a browser must never
-- be able to list ambassadors, their emails or anyone's announcements. The
-- deny-all policies say so in the schema, where the security advisor can see
-- it, in addition to the revoked grants.
--
-- Safe to run twice: every step checks before it changes anything.

-- 1. Ambassadors ----------------------------------------------------------------

ALTER TABLE public.ambassadors
  -- The account that signs in to the portal. Linked by the app on the first
  -- sign-in whose verified email matches ambassadors.email, never by an
  -- address someone typed. Unique: one account is one ambassador.
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS chapter TEXT,
  -- onboarded: in the GroupMe with a live code. accepted: picked, not yet
  -- onboarded. active: has accepted the portal agreement. earned: reached the
  -- goal and picked a departure. released: their held spot was let go.
  -- dropped: out of the program; the portal turns them away.
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMPTZ,
  -- The program whose rules apply (lib/ambassador-program.ts).
  ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'telluride-2026',
  -- Everyone is on the leaderboard unless they opt out (Carter, 29 Oct).
  ADD COLUMN IF NOT EXISTS leaderboard_hidden BOOLEAN NOT NULL DEFAULT false,
  -- The departure they chose for the free trip they earned, and when.
  ADD COLUMN IF NOT EXISTS reward_trip_id UUID,
  ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassadors_user_id_fkey') THEN
    ALTER TABLE public.ambassadors
      ADD CONSTRAINT ambassadors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassadors_user_id_key') THEN
    ALTER TABLE public.ambassadors ADD CONSTRAINT ambassadors_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassadors_reward_trip_id_fkey') THEN
    ALTER TABLE public.ambassadors
      ADD CONSTRAINT ambassadors_reward_trip_id_fkey FOREIGN KEY (reward_trip_id) REFERENCES public.trips (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassadors_status_check') THEN
    ALTER TABLE public.ambassadors ADD CONSTRAINT ambassadors_status_check
      CHECK (status IN ('onboarded', 'accepted', 'active', 'earned', 'released', 'dropped'));
  END IF;
END $$;

-- The portal links an account by exact, lowercased email (an ILIKE would let
-- "_" in an address match any character). Normalize what is there, then hold
-- every later write to the same form.
UPDATE public.ambassadors SET email = lower(btrim(email)) WHERE email IS NOT NULL AND email <> lower(btrim(email));
UPDATE public.ambassadors SET email = NULL WHERE email = '';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ambassadors_email_lower') THEN
    ALTER TABLE public.ambassadors ADD CONSTRAINT ambassadors_email_lower
      CHECK (email IS NULL OR (email = lower(btrim(email)) AND email <> ''));
  END IF;
END $$;
-- Two rows with one email would make the link ambiguous; the app refuses to
-- guess, and this stops it being set up in the first place.
CREATE UNIQUE INDEX IF NOT EXISTS ambassadors_email_key ON public.ambassadors (email) WHERE email IS NOT NULL;

-- Foreign keys the leaderboard and the admin page join on.
CREATE INDEX IF NOT EXISTS ambassadors_trip_id_idx ON public.ambassadors (trip_id);
CREATE INDEX IF NOT EXISTS ambassadors_reward_trip_id_idx ON public.ambassadors (reward_trip_id);

-- The 25 ambassadors made on 27 October were all onboarded (the seed sets the
-- rest from Carter's list).
UPDATE public.ambassadors SET status = 'onboarded' WHERE status = 'accepted' AND created_at < timestamptz '2026-10-29 00:00+00';

-- Bookings close per week since 29 October 2026: December at the end of 14
-- November, January at the end of 4 December, Central. The ambassador codes
-- keep crediting January bookings until January closes, so the $0 codes that
-- expired with the old single deadline move to the end of 4 December.
UPDATE public.discount_codes
SET expires_at = timestamptz '2026-12-05 05:59:59+00'
WHERE amount = 0 AND percent_off IS NULL AND expires_at = timestamptz '2026-11-15 05:59:59+00';

REVOKE ALL ON public.ambassadors FROM anon, authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ambassadors' AND policyname = 'Server only') THEN
    CREATE POLICY "Server only" ON public.ambassadors AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

-- 2. Announcements -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ambassador_announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Plain text, shown escaped. The app caps it at 600 characters too.
  body       TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published  BOOLEAN NOT NULL DEFAULT true
);

-- The dashboard reads the newest published one.
CREATE INDEX IF NOT EXISTS ambassador_announcements_published_idx
  ON public.ambassador_announcements (created_at DESC) WHERE published;

REVOKE ALL ON public.ambassador_announcements FROM anon, authenticated;
ALTER TABLE public.ambassador_announcements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ambassador_announcements' AND policyname = 'Server only') THEN
    CREATE POLICY "Server only" ON public.ambassador_announcements AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

-- 3. The ambassador agreement in legal_acceptances ----------------------------------

-- An acceptance used to be one row per booking and document. The agreement
-- belongs to an account, not a booking, so booking_id may now be null, but
-- only on an ambassador agreement row: every booking document still needs its
-- booking. Still append-only: the app never updates or deletes these rows.
ALTER TABLE public.legal_acceptances ALTER COLUMN booking_id DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_acceptances_booking_or_ambassador') THEN
    ALTER TABLE public.legal_acceptances ADD CONSTRAINT legal_acceptances_booking_or_ambassador
      CHECK (booking_id IS NOT NULL OR document_slug = 'ambassador-agreement');
  END IF;
END $$;
-- One acceptance per account and version: a double submit is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptances_account_document_key
  ON public.legal_acceptances (user_id, document_slug, document_version) WHERE booking_id IS NULL;

-- 4. Toolkit graphics ------------------------------------------------------------------

-- Private: files are served only by short-lived signed URLs the server makes
-- for a signed-in ambassador (shared/ for everyone, schools/<slug>/ for one
-- school). No storage.objects policy is added, so only the service role can
-- read, list or write. Images only, 4 MB at most, matching the admin upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ambassador-toolkit', 'ambassador-toolkit', false, 4194304, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
