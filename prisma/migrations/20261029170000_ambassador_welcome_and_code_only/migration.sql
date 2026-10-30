-- The final ambassador roster (29 October 2026). Safe to run twice.

-- When each ambassador was sent "Welcome to Outrider". /admin/ambassadors
-- sends it only when the team asks, one ambassador or a selection at a time.
-- The send claims this column first (set it where it is still null), so a
-- double click or two admins at once can never send it twice; a send that
-- fails puts it back to null so it can be tried again.
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- code_only: an earlier ambassador who keeps their $0 code but not the portal.
-- The row stays so /admin/ambassadors still counts their bookings and their
-- ?ref= link still works (the middleware needs an ambassadors row); the app
-- keeps them out of the portal, the leaderboard and the welcome email
-- (lib/ambassador-rules.ts, NO_PORTAL_STATUSES).
ALTER TABLE public.ambassadors DROP CONSTRAINT IF EXISTS ambassadors_status_check;
ALTER TABLE public.ambassadors ADD CONSTRAINT ambassadors_status_check
  CHECK (status IN ('onboarded', 'accepted', 'active', 'earned', 'released', 'dropped', 'code_only'));
