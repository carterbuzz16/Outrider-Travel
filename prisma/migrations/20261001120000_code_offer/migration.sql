-- The $100 code by email (lib/code-offer.ts, 1 October 2026). A visitor on
-- /telluride types an email address and gets a single-use discount code of
-- their own, on screen and by email, good for seven days. It replaced the
-- pop-up that asked for a new account before offering anything.
--
-- The address goes on the list (waitlist_signups), because that row already
-- carries what this needs: an unsubscribe token for the emails, the opt-in
-- answer and its evidence, and the campaign tags. The code itself is an
-- ordinary row in discount_codes, so checkout applies it, and claims it, the
-- way it does every other code.
--
--   offer_code              The code issued to this address. One per address,
--                           so asking twice sends the same code again rather
--                           than minting a second $100.
--   offer_reminder_sent_at  When "two days left" went (app/api/cron/
--                           code-offer-reminders). Claimed before sending, the
--                           same guard as booking_open_sent_at, so two runs
--                           never mail the same person twice.
--   offer_last_day_sent_at  When "last day" went. Same guard.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS offer_code TEXT UNIQUE REFERENCES public.discount_codes (code),
  ADD COLUMN IF NOT EXISTS offer_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_last_day_sent_at TIMESTAMPTZ;
