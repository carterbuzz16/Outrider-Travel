-- Generic fixed-window rate limiter, backed by Postgres rather than a new
-- external service (Redis/Upstash) — this app already depends on Postgres
-- for everything else, and traffic volume here doesn't warrant adding
-- another moving part yet.
CREATE TABLE "rate_limit_buckets" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "window_start" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "count" INTEGER NOT NULL DEFAULT 0
);

-- Not customer data and not queried per-request by any user-facing page,
-- so RLS isn't the relevant control here — the function below is called
-- exclusively via the service-role client (see requireAdmin-style usage
-- in app/auth/actions.ts and bookings/actions.ts), and the REVOKE below
-- keeps it that way regardless of RLS.
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;

-- Atomic check-and-increment via a single UPSERT: the window resets (count
-- -> 1) once it's older than p_window_seconds, otherwise it increments.
-- Doing this as one statement (rather than a separate select-then-write in
-- application code) is what makes it race-safe under concurrent calls for
-- the same key.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key TEXT, p_max INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_buckets AS rlb (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rlb.window_start < now() - (p_window_seconds || ' seconds')::interval THEN 1
      ELSE rlb.count + 1
    END,
    window_start = CASE
      WHEN rlb.window_start < now() - (p_window_seconds || ' seconds')::interval THEN now()
      ELSE rlb.window_start
    END
  RETURNING count INTO current_count;

  RETURN current_count <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
