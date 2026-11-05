-- Keep ambassador codes crediting spring break (3 November 2026).
--
-- Every ambassador's $0 code expires at the end of December 4, the last Telluride
-- close, and an expired code credits nothing: its ?ref= link stops setting the
-- cookie and the Referred by box refuses it. One code now sells both programs,
-- so this moves those codes to the last booking close of anything on sale. New
-- codes already get that date (app/admin/ambassadors/actions.ts).
--
-- Run it once in the Supabase SQL editor, any time before December 4. After that
-- date spring break bookings stop crediting until it has run.
--
-- It changes nothing about Telluride. A booking on a week past its own close is
-- refused whatever the code (departureClosed, createBooking), and a friend counts
-- only toward the program that owns their trip (lib/ambassador-rules.ts).
--
-- What it touches: discount_codes rows that belong to a row in ambassadors, are
-- worth exactly $0, and expire before the new date.
--   Not comp codes: they take a percentage off and belong to no ambassador.
--   Not chapter codes (CHPTR and the like): they take money off.
--   Not a dropped ambassador's code: it runs out on December 4 as it always would.
--   Not a code the team switched off: `active` is left as it is.
--   code_only ambassadors ARE included: they keep their code (29 October 2026).
--
-- The date is LAST_BOOKING_CLOSE in lib/signup-deadline.ts, and those closes are
-- placeholders until Carter confirms them. If one moves, tests/ambassador-spring-break.test.ts
-- fails until this date is changed: change it and run this again. Safe to run twice.

-- To see what it would change first:
--   SELECT dc.code, dc.expires_at, a.status FROM public.discount_codes dc
--   JOIN public.ambassadors a ON a.code = dc.code
--   WHERE dc.amount = 0 AND dc.percent_off IS NULL AND a.status <> 'dropped'
--     AND dc.expires_at < timestamptz '2027-01-23 05:59:59+00';

UPDATE public.discount_codes AS dc
SET expires_at = timestamptz '2027-01-23 05:59:59+00'
FROM public.ambassadors AS a
WHERE a.code = dc.code
  AND dc.amount = 0
  AND dc.percent_off IS NULL
  AND a.status <> 'dropped'
  AND dc.expires_at < timestamptz '2027-01-23 05:59:59+00';
