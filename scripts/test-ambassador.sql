-- A test ambassador, TESTCARTER, for trying the portal end to end on the live
-- site (29 October 2026). Run the ADD block on its own, sign in at
-- /ambassador/dashboard with the email below, then run the REMOVE block.
-- Never run the whole file at once. Needs the ambassador_portal migration.
--
-- The row is hidden on the leaderboard so real ambassadors never see it, and
-- the code is a $0 code like theirs, so a booking made with it changes no
-- price. Change the email to the one you will sign in with.

-- ADD ---------------------------------------------------------------------------
BEGIN;
INSERT INTO public.discount_codes (code, amount, max_uses, once_per_person, active, expires_at, note)
VALUES ('TESTCARTER', 0, 1000, false, true, timestamptz '2026-12-05 05:59:59+00',
        'Test ambassador code ($0) for Carter. Remove after testing (scripts/test-ambassador.sql).')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ambassadors (code, name, school, chapter, status, program, email, leaderboard_hidden)
VALUES ('TESTCARTER', 'Carter Test', 'Test School', NULL, 'onboarded', 'telluride-2026', 'carterbusby1+amb@gmail.com', true)
ON CONFLICT (code) DO NOTHING;
COMMIT;

-- REMOVE ------------------------------------------------------------------------
-- Takes the row, its agreement record and the code away. A code that was used
-- on a booking is switched off instead of deleted, so that booking keeps its
-- record.
BEGIN;
DELETE FROM public.legal_acceptances
WHERE booking_id IS NULL
  AND document_slug = 'ambassador-agreement'
  AND user_id = (SELECT user_id FROM public.ambassadors WHERE code = 'TESTCARTER');
DELETE FROM public.ambassadors WHERE code = 'TESTCARTER';
UPDATE public.discount_codes SET active = false
WHERE code = 'TESTCARTER' AND EXISTS (SELECT 1 FROM public.discount_redemptions WHERE code = 'TESTCARTER');
DELETE FROM public.discount_codes
WHERE code = 'TESTCARTER' AND NOT EXISTS (SELECT 1 FROM public.discount_redemptions WHERE code = 'TESTCARTER');
COMMIT;
