-- The "booking is open to everyone" reminder (/admin/launch, 28 September
-- 2026), sent once to list members who have not booked.
--
--   booking_open_sent_at  When the reminder went to this address. The send
--                         skips anyone already stamped, the same guard as
--                         early_access_sent_at, so pressing the button twice
--                         never mails the same person twice.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS booking_open_sent_at TIMESTAMPTZ;
