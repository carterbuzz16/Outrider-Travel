-- Applications from /ambassador (19 October 2026), the Campus Lead and
-- Ambassador program. Traffic comes from the "TRAVEL FOR FREE" pop-up in the
-- Chptr app. One row per application; the team reads them, picks people, and
-- gets in touch.
--
-- Written only by app/(site)/ambassador/actions.ts through the service-role
-- client, the same shape as waitlist_signups. Nothing reads it from the
-- browser.
--
--   instagram  The handle without its "@", lowercased. Instagram handles are
--              case-insensitive, so this is the one spelling to search on.
--   phone      E.164, US only: +1XXXXXXXXXX (lib/phone.ts normalizes it).
--   reach      The answer to "roughly how many friends could you bring on a
--              trip?": '1-5', '5-10' or '10+'.
--
-- Additive: a new table, nothing else touched. Guarded, so re-running it is a
-- no-op.

CREATE TABLE IF NOT EXISTS public.ambassador_applications (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  school      TEXT        NOT NULL,
  chapter     TEXT        NOT NULL,
  instagram   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  reach       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ambassador_applications_pkey PRIMARY KEY (id),
  -- The server validates all of this already (lib/ambassador-application.ts).
  -- These make the table refuse a malformed value from any other writer too.
  CONSTRAINT ambassador_applications_phone_us
    CHECK (phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
  CONSTRAINT ambassador_applications_instagram
    CHECK (instagram ~ '^[a-z0-9._]{1,30}$'),
  CONSTRAINT ambassador_applications_reach
    CHECK (reach IN ('1-5', '5-10', '10+')),
  CONSTRAINT ambassador_applications_field_lengths
    CHECK (
      char_length(name) BETWEEN 1 AND 120
      AND char_length(school) BETWEEN 1 AND 120
      AND char_length(chapter) BETWEEN 1 AND 120
    )
);

-- RLS on with no policies, and no table grants for the API roles either: the
-- table holds names and phone numbers, and it should take two mistakes, not
-- one, to expose them. The service role keeps everything.
ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_applications FROM anon, authenticated;
