-- Email capture for the coming-soon landing page. Deliberately not tied to
-- public.users (no account exists at signup time) — just a lightweight
-- lead list for admin to see who to notify at launch.
CREATE TABLE "waitlist_signups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "waitlist_signups_email_key" UNIQUE ("email")
);

ALTER TABLE "waitlist_signups" ENABLE ROW LEVEL SECURITY;
-- No policies: writes go through the service-role client (see
-- app/waitlist-actions.ts), same pattern as bookings/payments. Nobody
-- needs to read this table from the browser.
