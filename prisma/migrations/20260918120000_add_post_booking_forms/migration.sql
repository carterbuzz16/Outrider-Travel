-- Post-booking paperwork: the three things a traveler is asked for straight
-- after checkout (flights, a roommate request, traveler details), plus the
-- bookkeeping the follow-up emails and SMS opt-in need.
--
-- The live site does not know about any of this yet, so every new column on
-- bookings is nullable or has a default: an INSERT that names none of them
-- keeps working unchanged.
--
-- All reads and writes go through the service-role client (the /trip portal's
-- server actions, see app/trip/[bookingId]/actions.ts). The traveler reaching
-- the portal has no Supabase session at all, so there is nothing for an RLS
-- policy to key off, and none is added.

-- ---------------------------------------------------------------------------
-- bookings: task state and email/SMS bookkeeping
-- ---------------------------------------------------------------------------

ALTER TABLE "bookings"
  ADD COLUMN "flights_booked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rooming_submitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rooming_submitted_at" TIMESTAMPTZ,
  ADD COLUMN "details_submitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "confirmation_email_sent_at" TIMESTAMPTZ,
  ADD COLUMN "chase_email_sent_at" TIMESTAMPTZ,
  ADD COLUMN "sms_consent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms_consent_at" TIMESTAMPTZ,
  -- Which wording of the opt-in the traveler saw, so the consent can be
  -- reproduced later (same idea as legal_acceptances.document_version).
  ADD COLUMN "sms_consent_text_version" TEXT;

-- ---------------------------------------------------------------------------
-- Shared trigger: first submission time is permanent
-- ---------------------------------------------------------------------------

-- Rooms are assigned in the order requests arrive, so submitted_at is the
-- traveler's place in the queue. Editing a request must not move them to the
-- back (or, by re-submitting, to the front), whatever the application sends.
-- Enforced here rather than trusted to every caller of an upsert: an
-- ON CONFLICT DO UPDATE that names submitted_at still passes through this.
CREATE OR REPLACE FUNCTION public.keep_first_submitted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.submitted_at := OLD.submitted_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.keep_first_submitted_at() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- rooming_requests
-- ---------------------------------------------------------------------------

CREATE TABLE "rooming_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  -- Free text: the people named may not have booked yet, so these cannot be
  -- foreign keys. Matched up by hand when rooms are assigned.
  "roommate_names" TEXT[] NOT NULL DEFAULT '{}',
  "no_preference" BOOLEAN NOT NULL DEFAULT false,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "rooming_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rooming_requests_booking_id_key" UNIQUE ("booking_id"),
  CONSTRAINT "rooming_requests_booking_id_fkey" FOREIGN KEY ("booking_id")
    REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rooming_requests_max_three_names"
    CHECK (cardinality("roommate_names") <= 3),
  -- Either names or "put me anywhere", never both and never neither.
  CONSTRAINT "rooming_requests_names_xor_no_preference"
    CHECK ("no_preference" <> (cardinality("roommate_names") > 0)),
  -- NULL-safe: array_position finds a NULL element, which cardinality misses.
  CONSTRAINT "rooming_requests_names_not_null"
    CHECK (array_position("roommate_names", NULL) IS NULL),
  -- The form caps each name at 80 characters; this is the backstop.
  CONSTRAINT "rooming_requests_names_length"
    CHECK (char_length(array_to_string("roommate_names", '')) <= 300)
);

-- The assignment queue is read in this order.
CREATE INDEX "rooming_requests_submitted_at_idx" ON "rooming_requests"("submitted_at");

CREATE TRIGGER "rooming_requests_keep_first_submitted_at"
  BEFORE UPDATE ON "rooming_requests"
  FOR EACH ROW EXECUTE FUNCTION public.keep_first_submitted_at();

ALTER TABLE "rooming_requests" ENABLE ROW LEVEL SECURITY;
-- No policies. Service role only, like bookings writes and waitlist_signups.
REVOKE ALL ON TABLE "rooming_requests" FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- traveler_details (PII)
-- ---------------------------------------------------------------------------

-- Legal name and date of birth are for the insurer; phone and emergency
-- contact for the trip leaders; the rest for rentals and meals. This is the
-- most sensitive table in the schema, so it is service-role only twice over:
-- RLS on with no policies, AND table privileges revoked from the API roles, so
-- a policy added carelessly later still would not expose it on its own.
CREATE TABLE "traveler_details" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "legal_name" TEXT NOT NULL,
  "date_of_birth" DATE NOT NULL,
  "phone" TEXT NOT NULL,
  "emergency_contact_name" TEXT NOT NULL,
  "emergency_contact_phone" TEXT NOT NULL,
  -- Free text ("5'10\"", "178 cm"): travelers answer in whatever unit they
  -- know, and the rental shop reads it, not code.
  "height" TEXT,
  "weight" TEXT,
  "shoe_size" TEXT,
  "ski_or_board" TEXT NOT NULL,
  "ability_level" TEXT NOT NULL,
  "dietary_restrictions" TEXT,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "traveler_details_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "traveler_details_booking_id_key" UNIQUE ("booking_id"),
  CONSTRAINT "traveler_details_booking_id_fkey" FOREIGN KEY ("booking_id")
    REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "traveler_details_ski_or_board_check"
    CHECK ("ski_or_board" IN ('ski', 'snowboard')),
  CONSTRAINT "traveler_details_ability_level_check"
    CHECK ("ability_level" IN ('first_time', 'beginner', 'intermediate', 'advanced', 'expert')),
  -- A floor only. The plausible-age check (relative to today) is in the
  -- server action; a CHECK against now() would not be re-evaluated and would
  -- make old rows fail a later restore.
  CONSTRAINT "traveler_details_date_of_birth_check"
    CHECK ("date_of_birth" > DATE '1900-01-01'),
  CONSTRAINT "traveler_details_text_lengths_check" CHECK (
    char_length("legal_name") BETWEEN 1 AND 200
    AND char_length("phone") BETWEEN 1 AND 40
    AND char_length("emergency_contact_name") BETWEEN 1 AND 200
    AND char_length("emergency_contact_phone") BETWEEN 1 AND 40
    AND coalesce(char_length("height"), 0) <= 40
    AND coalesce(char_length("weight"), 0) <= 40
    AND coalesce(char_length("shoe_size"), 0) <= 40
    AND coalesce(char_length("dietary_restrictions"), 0) <= 1000
  )
);

CREATE TRIGGER "traveler_details_keep_first_submitted_at"
  BEFORE UPDATE ON "traveler_details"
  FOR EACH ROW EXECUTE FUNCTION public.keep_first_submitted_at();

ALTER TABLE "traveler_details" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "traveler_details" FROM anon, authenticated;
