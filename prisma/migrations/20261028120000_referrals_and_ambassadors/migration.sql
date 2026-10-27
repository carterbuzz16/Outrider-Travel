-- Referrals, ambassadors and held spots (27 October 2026).
--
-- Builds on tracking_only_codes. An ambassador's code is still a $0 row in
-- discount_codes and a booking is still credited to them by a
-- discount_redemptions row; what changes is that a booking can now hold one
-- of each kind of code:
--
--   discount     a code that takes money off (CHPTR, MARSHALL, a comp)
--   attribution  a $0 code that records who sent the booking (STEIN)
--
-- so a Chptr member booking through an ambassador keeps CHPTR's $150 and still
-- counts for the ambassador. The kind is the code's, not the caller's: amount
-- 0 is attribution, anything else is a discount.
--
-- Safe for the build already deployed, which claims one code per booking:
-- claim_discount_code keeps its first two arguments (the third has a
-- default), confirm_free_booking keeps its signature, and a booking that
-- only ever gets one code still has one redemption row.
--
-- Safe to run twice: every step checks before it changes anything.

-- 1. Two codes per booking --------------------------------------------------

ALTER TABLE public.discount_redemptions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'discount',
  -- How an attribution got there: typed at checkout, carried from a ?ref=
  -- link, or added by the team in /admin/ambassadors. Null on discounts.
  ADD COLUMN IF NOT EXISTS source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_kind_check') THEN
    ALTER TABLE public.discount_redemptions
      ADD CONSTRAINT discount_redemptions_kind_check CHECK (kind IN ('discount', 'attribution'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_source_check') THEN
    ALTER TABLE public.discount_redemptions
      ADD CONSTRAINT discount_redemptions_source_check CHECK (source IN ('typed', 'link', 'admin'));
  END IF;
END $$;

-- Redemptions made with a $0 code before this ran were attributions.
UPDATE public.discount_redemptions r
SET kind = 'attribution', source = coalesce(r.source, 'typed')
FROM public.discount_codes c
WHERE c.code = r.code AND c.amount = 0 AND r.kind <> 'attribution';

-- One of each kind per booking, in place of one per booking.
ALTER TABLE public.discount_redemptions DROP CONSTRAINT IF EXISTS discount_redemptions_booking_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_booking_kind_key') THEN
    ALTER TABLE public.discount_redemptions
      ADD CONSTRAINT discount_redemptions_booking_kind_key UNIQUE (booking_id, kind);
  END IF;
END $$;

-- As in free_package_codes, but a claim replaces only a code of the same
-- kind: claiming CHPTR on a booking that holds STEIN keeps STEIN. p_source is
-- how an attribution arrived ('typed' when not given); a discount's is null.
-- Replaced rather than overloaded, so a call naming p_code and p_booking
-- finds exactly one function.
DROP FUNCTION IF EXISTS public.claim_discount_code(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.claim_discount_code(p_code TEXT, p_booking UUID, p_source TEXT DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.discount_codes%ROWTYPE;
  b public.bookings%ROWTYPE;
  k TEXT;
  off NUMERIC;
  held NUMERIC;
BEGIN
  SELECT * INTO c FROM public.discount_codes WHERE code = p_code FOR UPDATE;
  IF NOT FOUND OR NOT c.active OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;
  k := CASE WHEN c.amount = 0 THEN 'attribution' ELSE 'discount' END;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;
  off := public.discount_code_value(c.code, b.tier_id);
  IF off IS NULL THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;

  SELECT amount INTO held FROM public.discount_redemptions
  WHERE booking_id = p_booking AND code = c.code;
  IF FOUND THEN
    RETURN held;
  END IF;

  IF public.discount_code_uses(c.code, NULL, p_booking) >= c.max_uses THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;
  IF c.once_per_person AND public.discount_code_used_by(c.code, b.user_id, p_booking) THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  DELETE FROM public.discount_redemptions WHERE booking_id = p_booking AND kind = k;
  INSERT INTO public.discount_redemptions (code, booking_id, amount, kind, source)
  VALUES (
    c.code, p_booking, off, k,
    CASE WHEN k = 'attribution' THEN coalesce(p_source, 'typed') ELSE NULL END
  );
  RETURN off;
END;
$$;

-- Unchanged except that the code paying for the booking is its discount: a
-- free booking can also carry an ambassador's code.
CREATE OR REPLACE FUNCTION public.confirm_free_booking(p_booking UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  held TEXT;
  c public.discount_codes%ROWTYPE;
  b public.bookings%ROWTYPE;
BEGIN
  SELECT code INTO held FROM public.discount_redemptions WHERE booking_id = p_booking AND kind = 'discount';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;
  SELECT * INTO c FROM public.discount_codes WHERE code = held FOR UPDATE;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking FOR UPDATE;
  IF NOT FOUND OR b.total_amount <> 0 THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;
  IF b.status = 'paid_in_full' THEN
    RETURN false;
  END IF;
  IF b.status <> 'pending'
     OR NOT EXISTS (SELECT 1 FROM public.discount_redemptions WHERE booking_id = p_booking AND code = c.code) THEN
    RAISE EXCEPTION 'free_booking_invalid';
  END IF;

  IF NOT c.active OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN
    RAISE EXCEPTION 'discount_code_invalid';
  END IF;
  IF public.discount_code_uses(c.code, NULL, p_booking) >= c.max_uses
     OR (c.once_per_person AND public.discount_code_used_by(c.code, b.user_id, p_booking)) THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;

  UPDATE public.bookings SET status = 'paid_in_full' WHERE id = p_booking;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_discount_code(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_free_booking(UUID) FROM PUBLIC, anon, authenticated;

-- 2. Held spots ---------------------------------------------------------------

-- A Four to a Room place kept for an ambassador with nothing paid on it
-- (/admin/ambassadors). It sits at deposit_paid so check_tier_capacity
-- counts it and nobody else gets the bed, owes the whole price, and has no
-- installments for the cron to charge. Never counted toward the ambassador's
-- five.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ambassador_hold BOOLEAN NOT NULL DEFAULT false;

-- 3. Ambassadors --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ambassadors (
  -- Their $0 code (tracking_only_codes), which is also their ?ref= link.
  code             TEXT PRIMARY KEY REFERENCES public.discount_codes (code),
  name             TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  school           TEXT,
  -- The account their held spot is booked on, and where its payment link goes.
  email            TEXT,
  phone            TEXT,
  instagram        TEXT,
  -- The departure they are going on (December or January).
  trip_id          UUID REFERENCES public.trips (id),
  -- held: a spot is kept. free: they reached five by the deadline. paying:
  -- they did not, and were sent a link to pay for it. released: the link was
  -- not paid by the deadline and the spot was let go. Null: no spot yet.
  hold_status      TEXT CHECK (hold_status IN ('held', 'free', 'paying', 'released')),
  hold_booking_id  UUID UNIQUE REFERENCES public.bookings (id) ON DELETE SET NULL,
  payment_link_id  TEXT,
  payment_link_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service role only, like discount_codes: the admin page reads and writes it
-- through the server, and a browser must never be able to list it.
REVOKE ALL ON public.ambassadors FROM anon, authenticated;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- The ambassadors whose codes were made on 27 October. Phone and Instagram
-- come from their /ambassador application (one each, matched by name); email
-- and trip are filled in on the admin page.
INSERT INTO public.ambassadors (code, name, school, phone, instagram)
SELECT v.code, v.name, v.school, a.phone, a.instagram
FROM (VALUES
  ('STEIN', 'Steven Stein', 'Miami'),
  ('DETHLEFS', 'Tim Dethlefs', 'Boise State'),
  ('DEJESUS', 'Jade De Jesus', 'UC Irvine'),
  ('AHO', 'Miller Aho', 'Tennessee'),
  ('MACKENNA', 'Maks Mackenna', 'Fairfield'),
  ('DANKOWSKI', 'Drew Dankowski', 'Rutgers'),
  ('BALIAN', 'Matthew Balian', 'USD'),
  ('JIBAJA', 'Henry Jibaja', 'South Carolina'),
  ('COLLINS', 'Michael Collins', 'Texas Tech'),
  ('SHIELDS', 'Matthew Shields', 'Texas A&M'),
  ('LOONEY', 'Austin Looney', 'Texas A&M'),
  ('ERHART', 'Jacob Erhart', 'Cincinnati'),
  ('SULLIVAN', 'Benton Sullivan', 'USD'),
  ('ISAACUW', 'Isaac', 'Washington'),
  ('PANTEA', 'Alex Pantea', 'New Mexico State'),
  ('HOPKINS', 'Johns Hopkins', 'Michigan'),
  ('EWING', 'Haley Ewing', 'Cal State San Marcos'),
  ('ZHU', 'Stanley Zhu', 'Illinois'),
  ('ENGBLOM', 'Jack Engblom', 'Penn State'),
  ('DEHAAN', 'Ezra DeHaan', 'South Dakota State'),
  ('REYNOLDS', 'AnnElise Reynolds', 'Wake Tech'),
  ('GRIGGS', 'Tanner Griggs', 'Southern Adventist'),
  ('MCLAREN', 'Daniel McLaren', 'Clemson'),
  ('REKOUTIS', 'Alexios Rekoutis', 'Cornell'),
  ('LAVERY', 'Robson Lavery', 'Mount Royal')
) AS v (code, name, school)
JOIN public.discount_codes c ON c.code = v.code
LEFT JOIN LATERAL (
  SELECT x.phone, x.instagram
  FROM public.ambassador_applications x
  WHERE lower(btrim(x.name)) = lower(v.name)
  ORDER BY x.created_at DESC
  LIMIT 1
) a ON true
ON CONFLICT (code) DO NOTHING;
