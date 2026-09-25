-- The list's head start on booking (lib/early-access.ts, /admin/launch).
--
--   early_access_token    The credential in each member's private booking
--                         link. Random per signup, and deliberately separate
--                         from unsubscribe_token: the booking link is meant to
--                         be forwarded to friends, and a forwarded link must not
--                         be able to unsubscribe its owner.
--   early_access_sent_at  When the head-start email went to this address. The
--                         send skips anyone already stamped, so pressing the
--                         button twice never mails the same person twice.
--
-- gen_random_uuid() is volatile, so ADD COLUMN evaluates it per row: every
-- existing signup gets its own token, not one shared value.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS early_access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS early_access_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_early_access_token_key
  ON public.waitlist_signups (early_access_token);
