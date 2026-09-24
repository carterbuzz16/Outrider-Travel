-- The waitlist asks for a name, a US mobile number and two opt-ins (email,
-- required; marketing texts, optional), and records where each signup came
-- from (the ?src= tag on a handed-out link, the form, the campaign tags).
--
-- Additive only. Every new column is nullable with no default, so the rows
-- from before this (email only) keep working with the new fields empty, and
-- null keeps meaning "never asked" as distinct from a recorded no. Safe to
-- apply before the code that writes these columns is deployed: the live
-- action inserts { email } only, which this does not affect.
--
-- Applied to the live database through the Supabase MCP as
-- "waitlist_contact_and_consent"; recorded here so a fresh environment built
-- from this folder matches. Every statement is guarded, so re-running it is a
-- no-op.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS first_name           TEXT,
  ADD COLUMN IF NOT EXISTS last_name            TEXT,
  -- E.164, US only: +1XXXXXXXXXX (lib/phone.ts normalizes it).
  ADD COLUMN IF NOT EXISTS phone                TEXT,
  ADD COLUMN IF NOT EXISTS email_consent        BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent          BOOLEAN,
  ADD COLUMN IF NOT EXISTS sms_consent_at       TIMESTAMPTZ,
  -- WAITLIST_CONSENT_VERSION in lib/waitlist-consent.ts: which wording was
  -- shown. With the IP and browser, the evidence if consent is questioned.
  ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_ip           TEXT,
  ADD COLUMN IF NOT EXISTS consent_user_agent   TEXT,
  ADD COLUMN IF NOT EXISTS src                  TEXT,
  ADD COLUMN IF NOT EXISTS placement            TEXT,
  ADD COLUMN IF NOT EXISTS utm_source           TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium           TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign         TEXT,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ;

-- The server validates all of this already. These make the table refuse a
-- malformed value from any other writer too. Nulls pass, so existing rows do.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_signups_phone_us') THEN
    ALTER TABLE public.waitlist_signups
      ADD CONSTRAINT waitlist_signups_phone_us
      CHECK (phone IS NULL OR phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_signups_field_lengths') THEN
    ALTER TABLE public.waitlist_signups
      ADD CONSTRAINT waitlist_signups_field_lengths
      CHECK (
        (first_name IS NULL OR char_length(first_name) <= 80)
        AND (last_name IS NULL OR char_length(last_name) <= 80)
        AND (src IS NULL OR char_length(src) <= 80)
        AND (placement IS NULL OR char_length(placement) <= 80)
        AND (utm_source IS NULL OR char_length(utm_source) <= 80)
        AND (utm_medium IS NULL OR char_length(utm_medium) <= 80)
        AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 80)
        AND (consent_text_version IS NULL OR char_length(consent_text_version) <= 80)
        AND (consent_ip IS NULL OR char_length(consent_ip) <= 100)
        AND (consent_user_agent IS NULL OR char_length(consent_user_agent) <= 300)
      );
  END IF;
END
$$;

-- "Everyone from tonight's event" is a filter on src.
CREATE INDEX IF NOT EXISTS waitlist_signups_src_idx ON public.waitlist_signups (src);

-- RLS is on with no policies, so the API roles already read and write
-- nothing. The table-level grants they still held are removed as well: the
-- table now holds names and phone numbers, and it should take two mistakes,
-- not one, to expose them. The service role keeps everything.
REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
